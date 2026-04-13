const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const projectRoot = resolve(__dirname, "..");
const envFilePath = resolve(projectRoot, ".env.local");

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

async function main() {
  if (!existsSync(envFilePath)) {
    throw new Error(
      "Missing backend/.env.local. Create it before running npm run seed:local-admin.",
    );
  }

  loadEnvFile(envFilePath);

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is missing from backend/.env.local. Cannot seed local admin.",
    );
  }

  await mongoose.connect(mongoUri);

  const userSchema = new mongoose.Schema(
    {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["admin", "staff"], default: "staff" },
      isActive: { type: Boolean, default: true },
      loginCount: { type: Number, default: 0 },
      lastLoginAt: { type: Date },
      archivedAt: { type: Date, default: null },
    },
    {
      collection: "users",
      timestamps: true,
    },
  );

  const User =
    mongoose.models.LocalSeedUser || mongoose.model("LocalSeedUser", userSchema);
  const passwordHash = await bcrypt.hash("admin", 10);

  const user = await User.findOneAndUpdate(
    { username: "admin" },
    {
      $set: {
        firstName: "Local",
        lastName: "Admin",
        username: "admin",
        password: passwordHash,
        role: "admin",
        isActive: true,
        archivedAt: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log(
    `Local admin user is ready in ${mongoUri} with username \"${user.username}\" and password \"admin\".`,
  );

  await mongoose.disconnect();
}

main()
  .catch(async (error) => {
    console.error(String(error.message || error));
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors after failed connect attempts.
    }
    process.exit(1);
  });
