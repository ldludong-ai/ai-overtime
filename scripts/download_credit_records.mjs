import fs from "node:fs";
import path from "node:path";

const env = loadEnv(path.resolve(".env"));
const SUPABASE_URL = getConfig("SUPABASE_URL", env);
const SERVICE_ROLE_KEY = getConfig("SUPABASE_SERVICE_ROLE_KEY", env);
const TABLE = getConfig("SUPABASE_CREDIT_TABLE", env) || "experiment2_credit_records";
const OUT_DIR = getArg("--out") || "data";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Create a local .env from .env.example.");
}

const rows = await fetchAllRows();
fs.mkdirSync(OUT_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const safeTable = TABLE.replace(/[^a-z0-9_]/gi, "_");
const jsonPath = path.join(OUT_DIR, `${safeTable}_${stamp}.json`);
const csvPath = path.join(OUT_DIR, `${safeTable}_${stamp}.csv`);

fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");
fs.writeFileSync(csvPath, `\uFEFF${toCsv(rows.map(flattenRow))}`, "utf8");

console.log(`Downloaded ${rows.length} credit records`);
console.log(`JSON: ${jsonPath}`);
console.log(`CSV:  ${csvPath}`);

async function fetchAllRows() {
  const pageSize = 1000;
  const allRows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`/rest/v1/${TABLE}`, normalizedUrl(SUPABASE_URL));
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "submitted_at.asc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      fail(`Supabase credit download failed: HTTP ${response.status}${body ? ` ${body}` : ""}`);
    }

    const rows = await response.json();
    allRows.push(...rows);
    if (rows.length < pageSize) return allRows;
  }
}

function flattenRow(row) {
  return {
    id: row.id,
    participant_id: row.participant_id,
    student_id: row.student_id,
    condition: row.condition,
    finished_at: row.finished_at,
    experiment_version: row.experiment_version,
    submitted_at: row.submitted_at
  };
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const pairs = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    pairs[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return pairs;
}

function getConfig(name, env) {
  return process.env[name] || env[name] || "";
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function normalizedUrl(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
