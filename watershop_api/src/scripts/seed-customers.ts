/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { CustomerSchema } from "../customers/entities/customer.entity";

type RowRecord = Record<string, unknown>;

const DEFAULT_FILE = path.resolve(process.cwd(), "Customers.xls");
const LOCAL_DOMAIN = "water-shop.local";

function loadEnvFromFile(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickField(row: RowRecord, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      const val = String(row[key]).trim();
      if (val) return val;
    }
  }
  return "";
}

function splitName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return { first: "Customer", last: "" };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "Customer" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return String(Math.trunc(value));
  }
  const str = String(value).trim();
  if (!str) return "";
  const digits = str.replace(/[^0-9+]/g, "");
  return digits || str;
}

function buildRowsFromSheet(xlsx: typeof import("xlsx"), filePath: string) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (
    | string[]
    | number[]
  )[];

  if (!rows.length) return [];

  const headerRow = rows[0].map((h) => normalizeHeader(String(h)));
  const dataRows = rows.slice(1).filter((row) =>
    row.some((cell) => String(cell).trim() !== ""),
  );

  const normalized: RowRecord[] = [];
  for (const row of dataRows) {
    const record: RowRecord = {};
    headerRow.forEach((header, idx) => {
      if (header) record[header] = row[idx];
    });
    normalized.push(record);
  }
  return normalized;
}

async function run() {
  const args = new Set(process.argv.slice(2));
  const fileArgIndex = process.argv.findIndex((arg) => arg === "--file");
  const outArgIndex = process.argv.findIndex((arg) => arg === "--output-dir");
  const filePath =
    fileArgIndex !== -1 && process.argv[fileArgIndex + 1]
      ? path.resolve(process.cwd(), process.argv[fileArgIndex + 1])
      : DEFAULT_FILE;
  const outputDir =
    outArgIndex !== -1 && process.argv[outArgIndex + 1]
      ? path.resolve(process.cwd(), process.argv[outArgIndex + 1])
      : process.cwd();
  const dryRun = args.has("--dry-run");

  const envPath = path.resolve(process.cwd(), ".env");
  loadEnvFromFile(envPath);

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set. Check .env");
  }

  let xlsx: typeof import("xlsx");
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    xlsx = require("xlsx");
  } catch (error) {
    console.error("Missing dependency: xlsx");
    console.error("Install it with: npm install xlsx");
    process.exit(1);
    return;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rows = buildRowsFromSheet(xlsx, filePath);

  const fieldMap = {
    name: ["name"],
    company: ["company name", "company", "business name"],
    street: ["street address", "street", "address"],
    city: ["city"],
    state: ["province", "state"],
    country: ["country"],
    zip: ["zip", "postal", "postal code"],
    phone: ["phone", "phone number", "mobile"],
    email: ["email", "email address"],
  };

  const CustomerModel = mongoose.model("Customer", CustomerSchema);

  await mongoose.connect(mongoUri);

  const seen = new Set<string>();
  const invalidRows: RowRecord[] = [];
  const skippedRows: RowRecord[] = [];
  let inserted = 0;
  let skipped = 0;
  let invalid = 0;

  for (const row of rows) {
    const name = pickField(row, fieldMap.name);
    const company = pickField(row, fieldMap.company);
    const street = pickField(row, fieldMap.street);
    const city = pickField(row, fieldMap.city);
    const state = pickField(row, fieldMap.state);
    const country = pickField(row, fieldMap.country) || "Canada";
    const zip = pickField(row, fieldMap.zip);
    const rawPhone = pickField(row, fieldMap.phone);
    const rawEmail = pickField(row, fieldMap.email);

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      invalid += 1;
      invalidRows.push({
        reason: "missing_phone",
        row,
      });
      continue;
    }

    const email = rawEmail
      ? normalizeEmail(rawEmail)
      : `unknown+${phone.replace(/\D/g, "") || Date.now()}@${LOCAL_DOMAIN}`;

    const dedupeKey = `${phone}::${email}`;
    if (seen.has(dedupeKey)) {
      skipped += 1;
      skippedRows.push({
        reason: "duplicate_in_file",
        row,
      });
      continue;
    }
    seen.add(dedupeKey);

    const isBusiness = Boolean(company);
    const nameParts = splitName(name);
    const contactName = name.trim();

    const firstName = isBusiness ? company : nameParts.first;
    const lastName = isBusiness ? nameParts.last || "Business" : nameParts.last;

    const addresses =
      street || city || state || zip || country
        ? [
            {
              label: isBusiness ? "Office" : "Home",
              street,
              city,
              state,
              zipCode: zip,
              country,
              isDefault: true,
            },
          ]
        : [];

    const familyMembers =
      isBusiness && contactName
        ? [
            {
              name: contactName,
              relationship: "Contact",
              phone: phone,
              email: rawEmail ? normalizeEmail(rawEmail) : undefined,
              allowCreditUse: false,
            },
          ]
        : [];

    const exists = await CustomerModel.findOne({
      $or: [{ phone }, { email }],
    }).lean();

    if (exists) {
      skipped += 1;
      skippedRows.push({
        reason: "already_exists",
        row,
      });
      continue;
    }

    if (dryRun) {
      inserted += 1;
      continue;
    }

    await CustomerModel.create({
      type: isBusiness ? "business" : "individual",
      firstName,
      lastName: lastName || "Customer",
      email,
      phone,
      addresses,
      familyMembers,
    });
    inserted += 1;
  }

  await mongoose.disconnect();

  const invalidPath = path.join(outputDir, "seed-customers-invalid.json");
  const skippedPath = path.join(outputDir, "seed-customers-skipped.json");
  fs.writeFileSync(invalidPath, JSON.stringify(invalidRows, null, 2));
  fs.writeFileSync(skippedPath, JSON.stringify(skippedRows, null, 2));

  console.log(
    JSON.stringify(
      {
        inserted,
        skipped,
        invalid,
        total: rows.length,
        dryRun,
        invalidPath,
        skippedPath,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
