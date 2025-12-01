import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_remote_tags.json');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_character_summaries.json');
const API_BASE = 'https://api.bgm.tv/v0';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'User-Agent': 'anime-character-guessr/fetch-summaries',
    Accept: 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadIds() {
  const raw = await fs.readFile(INPUT, 'utf-8');
  const parsed = JSON.parse(raw);
  const ids = new Set();
  (parsed?.data || []).forEach((entry) => {
    const num = Number(entry.remoteId);
    if (Number.isFinite(num)) ids.add(num);
  });
  return Array.from(ids);
}

async function fetchSummary(id) {
  const resp = await http.get(`/characters/${id}`);
  if (resp.status !== 200 || !resp.data) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.data.summary || '';
}

async function main() {
  const ids = await loadIds();
  console.log(`Found ${ids.length} character ids. Start fetching summaries...`);

  const data = {};
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const summary = await fetchSummary(id);
      data[id] = summary;
      console.log(`[${i + 1}/${ids.length}] ${id} ok`);
    } catch (err) {
      failed.push({ id, error: err.message || String(err) });
      console.warn(`[${i + 1}/${ids.length}] ${id} failed: ${err.message || err}`);
    }
    await sleep(150); // simple rate limit
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalIds: ids.length,
    succeeded: Object.keys(data).length,
    failed,
    data
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Done. Saved summaries to ${OUTPUT}, failed ${failed.length}.`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
