import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { RealtimeService } from "./realtime/realtime.service";
import { attachDashboardWebSocketServer } from "./realtime/dashboard-ws.server";
import { Server } from "http";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips out properties that are not in the DTO
      forbidNonWhitelisted: true, // Throws error if extra properties are sent
    }),
  );

  // --- SWAGGER CONFIGURATION STARTS HERE ---
  const config = new DocumentBuilder()
    .setTitle("Woodstock POS API")
    .setDescription("The backend API for the Water Shop POS")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document); // Swagger will run at /api
  // --- SWAGGER CONFIGURATION ENDS HERE ---

  const dashboardWsServer = attachDashboardWebSocketServer(
    app.getHttpServer() as Server,
  );
  const realtimeService = app.get(RealtimeService);
  realtimeService.setBroadcaster((event) => dashboardWsServer.broadcast(event));

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
