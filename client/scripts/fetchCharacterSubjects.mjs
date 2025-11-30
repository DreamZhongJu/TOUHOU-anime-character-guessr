import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_remote_tags.json');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_character_subjects.json');
const API_BASE = 'https://api.bgm.tv/v0';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'User-Agent': 'anime-character-guessr/fetch-character-subjects',
    Accept: 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadCharacterIds() {
  const raw = await fs.readFile(INPUT, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.data)) {
    throw new Error('Invalid touhou_remote_tags.json structure: missing data array');
  }
  const ids = new Set();
  parsed.data.forEach((entry) => {
    const num = Number(entry.remoteId);
    if (Number.isFinite(num)) ids.add(num);
  });
  return Array.from(ids);
}

async function fetchSubjects(characterId) {
  const resp = await http.get(`/characters/${characterId}/subjects`);
  if (resp.status !== 200 || !Array.isArray(resp.data)) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.data;
}

async function main() {
  const ids = await loadCharacterIds();
  console.log(`Found ${ids.length} character ids, start fetching subjects...`);

  const data = [];
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const subjects = await fetchSubjects(id);
      data.push({ characterId: id, subjects });
      console.log(`[${i + 1}/${ids.length}] ${id} ok`);
    } catch (err) {
      failed.push({ characterId: id, error: err.message || String(err) });
      console.warn(`[${i + 1}/${ids.length}] ${id} failed: ${err.message || err}`);
    }
    await sleep(150); // simple rate limit
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalIds: ids.length,
    succeeded: data.length,
    failed,
    data
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Done. Saved ${data.length} entries to ${OUTPUT}, failed ${failed.length}.`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
