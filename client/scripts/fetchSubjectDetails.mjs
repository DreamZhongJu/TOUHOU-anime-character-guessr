import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_remote_tags.json');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'touhou_subjects.json');
const API_BASE = 'https://api.bgm.tv/v0';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'User-Agent': 'anime-character-guessr/fetch-subjects',
    Accept: 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadSubjectIds() {
  const raw = await fs.readFile(INPUT, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.data)) {
    throw new Error('Invalid touhou_remote_tags.json structure: missing data array');
  }
  const ids = new Set();
  parsed.data.forEach((entry) => {
    if (Array.isArray(entry.subjectIds)) {
      entry.subjectIds.forEach((id) => {
        const num = Number(id);
        if (Number.isFinite(num)) ids.add(num);
      });
    }
  });
  return Array.from(ids);
}

async function fetchSubject(id) {
  const resp = await http.get(`/subjects/${id}`);
  if (resp.status !== 200 || !resp.data) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const tags = Array.isArray(resp.data.tags)
    ? resp.data.tags
        .filter((tag) => tag?.name)
        .map((tag) => ({ name: tag.name, count: typeof tag.count === 'number' ? tag.count : 1 }))
    : [];
  const metaTags = Array.isArray(resp.data.meta_tags)
    ? resp.data.meta_tags.filter(Boolean)
    : [];
  return {
    id: resp.data.id,
    type: resp.data.type,
    name: resp.data.name || '',
    name_cn: resp.data.name_cn || '',
    date: resp.data.date || '',
    platform: resp.data.platform || '',
    summary: resp.data.summary || '',
    rating: resp.data.rating || null,
    images: resp.data.images || null,
    meta_tags: metaTags,
    tags
  };
}

async function main() {
  const ids = await loadSubjectIds();
  console.log(`Found ${ids.length} unique subject ids, start fetching...`);

  const data = [];
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const subject = await fetchSubject(id);
      data.push(subject);
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
    succeeded: data.length,
    failed,
    data
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Done. Saved ${data.length} subjects to ${OUTPUT}, failed ${failed.length}.`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
