import fs from "node:fs";
import path from "node:path";

const env = loadEnv(path.resolve(".env"));
const SUPABASE_URL = getConfig("SUPABASE_URL", env);
const SERVICE_ROLE_KEY = getConfig("SUPABASE_SERVICE_ROLE_KEY", env);
const TABLE = getConfig("SUPABASE_TABLE", env) || "experiment2_responses";
const OUT_DIR = getArg("--out") || "data";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Create a local .env from .env.example.");
}

const rows = await fetchAllRows();
fs.mkdirSync(OUT_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(OUT_DIR, `experiment2_responses_${stamp}.json`);
const csvPath = path.join(OUT_DIR, `experiment2_responses_${stamp}.csv`);

fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");
fs.writeFileSync(csvPath, toCsv(rows.map(flattenRow)), "utf8");

console.log(`Downloaded ${rows.length} rows`);
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
      fail(`Supabase download failed: HTTP ${response.status}${body ? ` ${body}` : ""}`);
    }

    const rows = await response.json();
    allRows.push(...rows);
    if (rows.length < pageSize) return allRows;
  }
}

function flattenRow(row) {
  const payload = row.payload || {};
  const profile = row.profile || payload.profile || {};
  const mediator = row.mediator || payload.mediator || {};
  const posttest = row.posttest || payload.posttest || {};
  const metrics = row.metrics || payload.metrics || {};

  return {
    id: row.id,
    participant_id: row.participant_id || payload.participantId,
    condition: row.condition || payload.condition,
    consent: row.consent || payload.consent,
    started_at: row.started_at || payload.startedAt,
    finished_at: row.finished_at || payload.finishedAt,
    submitted_at: row.submitted_at,
    major: profile.major,
    grade: profile.grade,
    genai_ever_used: profile.genai_ever_used,
    genai_use_frequency: profile.genai_use_frequency,
    wdi_1: mediator.wdi_1,
    wdi_2: mediator.wdi_2,
    wdi_3: mediator.wdi_3,
    wdi_4: mediator.wdi_4,
    wdi_5: mediator.wdi_5,
    tc_1: mediator.tc_1,
    tc_2: mediator.tc_2,
    tc_3: mediator.tc_3,
    tc_4: mediator.tc_4,
    tc_5: mediator.tc_5,
    genai_like_1: posttest.genai_like_1,
    genai_like_2: posttest.genai_like_2,
    genai_like_3: posttest.genai_like_3,
    info_amount: posttest.info_amount,
    support_clarity: posttest.support_clarity,
    task_difficulty: posttest.task_difficulty,
    support_identification: posttest.support_identification,
    purpose_guess: posttest.purpose_guess,
    draft_word_count: metrics.draftWordCount,
    final_word_count: metrics.finalWordCount,
    added_word_count: metrics.addedWordCount,
    text_length_change: metrics.textLengthChange,
    main_task_time_seconds: metrics.mainTaskTimeSeconds,
    extra_time_seconds: metrics.extraTimeSeconds,
    assistant_click_count: metrics.assistantClickCount,
    work_demand_intensification: metrics.work_demand_intensification,
    time_control: metrics.time_control,
    genai_assistance_check: metrics.genai_assistance_check,
    chose_continue: payload.choseContinue,
    finished_early: payload.finishedEarly,
    revision_submitted_early: payload.revisionSubmittedEarly,
    draft_text: row.draft_text || payload.draftText,
    final_text: row.final_text || payload.finalText,
    assistant_click_log: JSON.stringify(row.assistant_click_log || payload.assistantClickLog || []),
    click_log: JSON.stringify(row.click_log || payload.clickLog || [])
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
