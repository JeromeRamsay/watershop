import { createHash } from "crypto";
import { IncomingMessage, Server } from "http";
import { Duplex } from "stream";

const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const DASHBOARD_WS_PATH = "/ws/dashboard";

function createAcceptKey(key: string) {
  return createHash("sha1")
    .update(key + WS_MAGIC)
    .digest("base64");
}

function encodeTextFrame(text: string) {
  const payload = Buffer.from(text);
  const payloadLength = payload.length;

  if (payloadLength < 126) {
    const header = Buffer.from([0x81, payloadLength]);
    return Buffer.concat([header, payload]);
  }

  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payload]);
}

function handleClientFrame(socket: Duplex, chunk: Buffer) {
  if (chunk.length < 2) return;
  const opcode = chunk[0] & 0x0f;

  // Close frame
  if (opcode === 0x8) {
    socket.end();
    return;
  }

  // Ping frame -> Pong frame
  if (opcode === 0x9) {
    socket.write(Buffer.from([0x8a, 0x00]));
  }
}

function isDashboardUpgrade(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);
  return url.pathname === DASHBOARD_WS_PATH;
}

export function attachDashboardWebSocketServer(server: Server) {
  const clients = new Set<Duplex>();

  server.on("upgrade", (req, socket) => {
    if (!isDashboardUpgrade(req)) {
      socket.destroy();
      return;
    }

    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }

    const accept = createAcceptKey(key);
    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n",
    ];
    socket.write(responseHeaders.join("\r\n"));

    clients.add(socket);
    socket.on("data", (chunk: Buffer) => handleClientFrame(socket, chunk));
    socket.on("close", () => clients.delete(socket));
    socket.on("end", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  return {
    broadcast(payload: object) {
      const frame = encodeTextFrame(JSON.stringify(payload));
      for (const client of clients) {
        if (!client.destroyed && client.writable) {
          client.write(frame);
        }
      }
    },
  };
}
