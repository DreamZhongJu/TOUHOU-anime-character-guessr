import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_remote_tags.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'touhou_characters');
const API_BASE = 'https://api.bgm.tv/v0';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'User-Agent': 'anime-character-guessr/fetch-character-images',
    Accept: 'application/json'
  },
  responseType: 'arraybuffer',
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

function pickImageUrl(character) {
  if (!character || !character.images) return null;
  return character.images.medium || character.images.large || character.images.grid || character.images.small || null;
}

function inferExt(url) {
  if (!url) return '.jpg';
  try {
    const u = new URL(url);
    const last = path.basename(u.pathname);
    const dot = last.lastIndexOf('.');
    if (dot !== -1) return last.slice(dot);
  } catch {
    /* ignore parse errors */
  }
  return '.jpg';
}

async function fetchCharacterMeta(id) {
  const resp = await http.get(`/characters/${id}`, { responseType: 'json' });
  if (resp.status !== 200 || !resp.data) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.data;
}

async function downloadImage(id, url) {
  const ext = inferExt(url);
  const filePath = path.join(OUTPUT_DIR, `${id}${ext}`);
  try {
    await fs.access(filePath);
    return { skipped: true, filePath };
  } catch {
    // file not exists, continue
  }
  const resp = await http.get(url);
  if (resp.status !== 200) {
    throw new Error(`Image HTTP ${resp.status}`);
  }
  await fs.writeFile(filePath, resp.data);
  return { skipped: false, filePath };
}

async function main() {
  const ids = await loadCharacterIds();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const meta = await fetchCharacterMeta(id);
      const imageUrl = pickImageUrl(meta);
      if (!imageUrl) {
        throw new Error('No image url found');
      }
      const result = await downloadImage(id, imageUrl);
      console.log(`[${i + 1}/${ids.length}] ${id} ${result.skipped ? 'skip(exists)' : 'saved'}`);
    } catch (err) {
      failed.push({ id, error: err.message || String(err) });
      console.warn(`[${i + 1}/${ids.length}] ${id} failed: ${err.message || err}`);
    }

    await sleep(150); // simple rate limit
  }

  const reportPath = path.join(OUTPUT_DIR, 'download_report.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: ids.length,
        failed
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`Done. Failed ${failed.length}. Report saved to ${reportPath}`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
