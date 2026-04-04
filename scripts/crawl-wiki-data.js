/**
 * crawl-wiki-data.js
 *
 * Scrapes PRTS wiki (prts.wiki) for:
 *   1. All operator data (name, rarity, approach, class, half-image URL)
 *   2. All limited banner history (pool name, 6★ featured, 5★ companions)
 *
 * Outputs:
 *   - ../src/json/official.json   (full operator data from wiki)
 *   - ../src/json/filteredData.json (operators in gacha pools)
 *   - ../crawl-output/banners.json (limited pool history)
 *   - ../crawl-output/new-operators.json (operators not yet in rarity_N.json)
 *
 * Requires: puppeteer, axios, fs
 *   npm install puppeteer axios
 *
 * Usage:
 *   cd "image crawler"
 *   node crawl-wiki-data.js
 */

'use strict';

const puppeteer = require('puppeteer');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────────────────────
const WIKI_BASE = 'https://prts.wiki';
const WIKI_API  = `${WIKI_BASE}/api.php`;
const POOL_LIST_URL = `${WIKI_BASE}/w/%E5%8D%A1%E6%B1%A0%E4%B8%80%E8%A7%88/%E9%99%90%E6%97%B6%E5%AF%BB%E8%AE%BF`;

const OUT_DIR       = path.resolve(__dirname, '../crawl-output');
const SRC_JSON_DIR  = path.resolve(__dirname, '../src/json');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DELAY_MS = 1500;

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Compute MediaWiki hash path for a given filename.
// hash = md5(filename); dir1 = hash[0]; dir2 = hash[0:2]
function halfImgUrl(cn) {
  const filename = `\u534A\u8EAB\u50CF_${cn}_1.png`; // 半身像_<cn>_1.png
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  const encoded = encodeURIComponent(filename).replace(/%20/g, '_');
  return `//media.prts.wiki/${hash[0]}/${hash.slice(0, 2)}/${encoded}`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✓ Written: ${filePath}`);
}

function loadExistingRarityJson() {
  const existing = new Map(); // en → { rarity, approach, cn }
  for (let r = 1; r <= 6; r++) {
    const file = path.join(SRC_JSON_DIR, `rarity_${r}.json`);
    if (!fs.existsSync(file)) continue;
    const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const e of entries) {
      if (e.en) existing.set(e.en, { rarity: e.rarity, approach: e.approach, cn: e.cn });
    }
  }
  return existing;
}

// ── Approach mapping (simplified CN → approach labels used in rarity_N.json) ─
// PRTS wiki uses text like "标准寻访", "限定寻访", "公招" etc.
const APPROACH_MAP = {
  '标准寻访': '標準尋訪',
  '限定寻访': '限定尋訪',
  '公开招募': '公開招募',
  '活动获得': '活動獲得',
  '联合行动': '聯合行動',
};

function mapApproach(raw) {
  if (!raw) return '其他';
  return APPROACH_MAP[raw.trim()] ?? raw.trim();
}

// ── Phase 1: Fetch operator list via SMW API (no Puppeteer needed) ───────────
async function scrapeOperators() {
  console.log('\n[Phase 1] Fetching operator list via PRTS wiki SMW API...');
  const operators = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const query = `[[Category:\u5e72\u5458]]|?\u7a00\u6709\u5ea6|?\u804c\u4e1a|?\u4f4d\u7f6e|?\u6027\u522b|?\u5e72\u5458\u5916\u6587\u540d|limit=${limit}|offset=${offset}`;
    // [[Category:干员]]|?稀有度|?职业|?位置|?性别|?干员外文名
    const url = `${WIKI_API}?action=ask&query=${encodeURIComponent(query)}&format=json`;
    const raw = await httpGet(url);
    const json = JSON.parse(raw);
    const results = json.query?.results || {};
    const entries = Object.entries(results);

    if (entries.length === 0) break;

    for (const [cn, op] of entries) {
      const rarity = parseInt(op.printouts['\u7a00\u6709\u5ea6']?.[0] ?? '0', 10);
      // 稀有度
      if (rarity < 1) continue; // skip hidden/testing operators
      operators.push({
        cn,
        en:       op.printouts['\u5e72\u5458\u5916\u6587\u540d']?.[0] || cn, // 干员外文名
        rarity:   String(rarity),
        class:    op.printouts['\u804c\u4e1a']?.[0] || '',  // 职业
        position: op.printouts['\u4f4d\u7f6e']?.[0] || '',  // 位置
        sex:      op.printouts['\u6027\u522b']?.[0] || '',  // 性别
        approach: '',  // Not available via SMW; fill manually for new operators
        imgSrc:   halfImgUrl(cn),
      });
    }

    const nextOffset = json['query-continue-offset'];
    if (!nextOffset || nextOffset <= offset) break;
    offset = nextOffset;
    process.stdout.write(`\r  Fetched ${operators.length} operators...`);
    await sleep(500); // be polite to the API
  }

  process.stdout.write('\n');
  return operators;
}

// ── Phase 3: Scrape pool history from 卡池一覧/限時尋訪 ──────────────────────
// Page structure: two h2 sections — 非標準尋訪 (limited) and 標準尋訪 (standard)
async function scrapePools(page) {
  console.log('\n[Phase 3] Fetching pool history from PRTS wiki (限時尋訪 page)...');
  await page.goto(POOL_LIST_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

  const result = await page.evaluate(() => {
    /**
     * Parse all rows from the first TABLE that follows a given h2 heading.
     * Returns an array of { poolName, openTime, featured6, featured5, isLimited }
     */
    function parseSection(headingText) {
      const headings = Array.from(document.querySelectorAll('h2'));
      const heading = headings.find((h) => {
        const span = h.querySelector('.mw-headline');
        return (span?.textContent ?? h.textContent ?? '').includes(headingText);
      });
      if (!heading) return [];

      const rows = [];
      let el = heading.nextElementSibling;
      while (el) {
        if (el.tagName === 'H2') break; // stop at next h2
        if (el.tagName === 'TABLE' || el.querySelector('table')) {
          const table = el.tagName === 'TABLE' ? el : el.querySelector('table');
          table.querySelectorAll('tbody tr').forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;
            const poolName   = cells[0]?.innerText?.replace(/\n|\t/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
            const openTime   = cells[1]?.innerText?.trim() ?? '';
            const raw6       = cells[2]?.innerText?.trim() ?? '';
            const raw5       = cells[3]?.innerText?.trim() ?? '';
            // skip header rows and note rows (those with colspan / no valid pool name)
            if (!poolName || !openTime || openTime.length < 5) return;
            // "限" prefix in the 6★ column indicates a limited character
            const isLimited  = raw6.startsWith('限');
            const featured6  = raw6.replace(/^限\s*/, '').trim();
            const featured5  = raw5.replace(/^限\s*/gm, '').trim();
            rows.push({ poolName, openTime, featured6, featured5, isLimited });
          });
          break; // only the first table per section
        }
        el = el.nextElementSibling;
      }
      return rows;
    }

    return {
      limited:  parseSection('非标准寻访'),
      standard: parseSection('标准寻访'),
    };
  });

  console.log(`  非標準尋訪 (limited) rows: ${result.limited.length}`);
  console.log(`  標準尋訪  (standard) rows: ${result.standard.length}`);
  return result;
}

// ── Phase 4: Compare with existing rarity_N.json ─────────────────────────────
function findNewOperators(scraped, existing) {
  return scraped.filter((op) => {
    // Match by English name
    if (op.en && existing.has(op.en)) return false;
    // Match by CN name (simplified) — check if any existing entry has similar cn
    for (const [, existEntry] of existing) {
      if (existEntry.cn === op.cn) return false;
    }
    return true;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  ensureDir(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: { width: 1280, height: 900 },
  });

  const pages = await browser.pages();
  const page = pages[0];
  await page.setUserAgent(USER_AGENT);

  try {
    // ── Phase 1: Operator list via SMW API ──────────────────────────────────
    const enriched = await scrapeOperators();
    console.log(`  Total operators scraped: ${enriched.length}`);

    // Build filteredData.json format
    const filteredData = enriched.map((op, idx) => ({
      cn:       op.cn,
      en:       op.en || op.cn,
      rarity:   op.rarity,
      approach: op.approach ? [mapApproach(op.approach)] : [],
      sort_id:  String(enriched.length - idx),
    }));

    // Build official.json format
    const official = enriched.map((op, idx) => ({
      cn:       op.cn,
      en:       op.en || op.cn,
      rarity:   op.rarity,
      class:    op.class || '',
      sex:      op.sex || '',
      position: op.position || '',
      race:     op.race ? [op.race] : [],
      approach: op.approach ? [mapApproach(op.approach)] : [],
      half:     op.imgSrc || op.half || '',
      sort_id:  String(enriched.length - idx),
    }));

    writeJson(path.join(OUT_DIR, 'official-wiki.json'), official);
    writeJson(path.join(OUT_DIR, 'filteredData-wiki.json'), filteredData);

    // ── Phase 3: Pool history ────────────────────────────────────────────────
    const pools = await scrapePools(page);
    console.log(`\n  Limited pools: ${pools.limited.length}, Standard pools: ${pools.standard.length}`);
    writeJson(path.join(OUT_DIR, 'banners.json'), pools);

    // ── Phase 4: Diff against existing rarity_N.json ─────────────────────────
    const existing = loadExistingRarityJson();
    const newOps = findNewOperators(enriched, existing);
    console.log(`\n  New operators not in rarity_N.json: ${newOps.length}`);
    if (newOps.length > 0) {
      console.log('  New operators:');
      newOps.forEach((op) =>
        console.log(`    - ${op.cn} (${op.en || '?'}) ★${op.rarity} [${op.approach}]`),
      );
    }
    writeJson(path.join(OUT_DIR, 'new-operators.json'), newOps);

    console.log('\n✅ Done! Check crawl-output/ for results.');
    console.log(
      '   Review new-operators.json and add TW traditional Chinese names + images manually.',
    );
  } finally {
    await browser.close();
  }
})().catch((err) => {
  const isNetworkError =
    err.message &&
    (err.message.includes('net::ERR_') ||
      err.message.includes('ERR_CONNECTION') ||
      err.message.includes('ERR_NAME_NOT_RESOLVED') ||
      err.message.includes('TimeoutError'));
  if (isNetworkError) {
    console.warn('\n⚠️  Wiki unreachable (network error) — skipping crawl step.');
    console.warn(`   ${err.message.split('\n')[0]}`);
    console.warn('   Continuing pipeline with existing local data.\n');
    process.exit(0);
  }
  console.error('\n❌ Crawler error:', err.message);
  process.exit(1);
});
