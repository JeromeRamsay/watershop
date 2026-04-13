const { spawn } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const envFilePath = resolve(projectRoot, ".env.local");
const nestCliPath = resolve(
  projectRoot,
  "node_modules",
  "@nestjs",
  "cli",
  "bin",
  "nest.js",
);

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = rawLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    let value = rawLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

if (!existsSync(envFilePath)) {
  console.error(
    "Missing backend/.env.local. Create it before running npm run start:local.",
  );
  process.exit(1);
}

if (!existsSync(nestCliPath)) {
  console.error(
    "Nest CLI is missing. Run npm install in backend before using start:local.",
  );
  process.exit(1);
}

loadEnvFile(envFilePath);

const child = spawn(process.execPath, [nestCliPath, "start", "--watch"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    WATERSHOP_LOCAL_ENV_FILE: envFilePath,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
