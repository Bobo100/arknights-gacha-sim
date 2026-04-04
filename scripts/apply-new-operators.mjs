/**
 * scripts/apply-new-operators.mjs
 *
 * Takes the output of "crawl-wiki-data.js" (crawl-output/new-operators.json)
 * and interactively helps you add new operators to the rarity_N.json files.
 *
 * Workflow:
 *   1. Run: node "image crawler/crawl-wiki-data.js"
 *   2. Review: crawl-output/new-operators.json
 *   3. For each new operator, provide Traditional Chinese name + image:
 *        crawl-output/new-operators.json   ← edit: add "twCn" field
 *        src/image/<TW-name>/<TW-name>-half.png  ← add image manually
 *   4. Run: node scripts/apply-new-operators.mjs
 *
 * Also provides a separate mode to update filteredData.json / official.json
 * from the wiki-scraped data (filteredData-wiki.json / official-wiki.json).
 *
 * Usage:
 *   node scripts/apply-new-operators.mjs              # apply new rarity_N entries
 *   node scripts/apply-new-operators.mjs --sync-meta  # sync filteredData.json + official.json
 *   node scripts/apply-new-operators.mjs --dry-run    # preview without writing files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as OpenCC from 'opencc-js';

// Simplified → Traditional Chinese (Taiwan standard)
const s2tw = OpenCC.Converter({ from: 'cn', to: 'twp' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_JSON_DIR   = join(__dirname, '../src/json');
const CRAWL_OUT_DIR  = join(__dirname, '../crawl-output');
const DRY_RUN        = process.argv.includes('--dry-run');
const SYNC_META      = process.argv.includes('--sync-meta');

// ── Helpers ──────────────────────────────────────────────────────────────────
function readJson(filePath) {
  if (!existsSync(filePath)) {
    console.error(`  ✗ File not found: ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would write: ${filePath}`);
    return;
  }
  writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
  console.log(`  ✓ Updated: ${filePath}`);
}

function loadRarityFile(rarity) {
  return readJson(join(SRC_JSON_DIR, `rarity_${rarity}.json`));
}

function saveRarityFile(rarity, data) {
  writeJson(join(SRC_JSON_DIR, `rarity_${rarity}.json`), data);
}

// ── Approach mapping (simplified → traditional) ──────────────────────────────
const APPROACH_MAP = {
  '标准寻访': '標準尋訪',
  '限定寻访': '限定尋訪',
  '公开招募': '公開招募',
  '活动获得': '活動獲得',
  '联合行动': '聯合行動',
};

function mapApproach(raw) {
  if (!raw) return '其他';
  if (Array.isArray(raw)) return raw.map(mapApproach);
  return APPROACH_MAP[raw.trim()] ?? raw.trim();
}

// ── Mode 1: Apply new operators to rarity_N.json ─────────────────────────────
function applyNewOperators() {
  const newOpsPath = join(CRAWL_OUT_DIR, 'new-operators.json');
  if (!existsSync(newOpsPath)) {
    console.error(
      '  ✗ crawl-output/new-operators.json not found.\n' +
      '    Run: node "image crawler/crawl-wiki-data.js" first.',
    );
    process.exit(1);
  }

  const newOps = readJson(newOpsPath);

  // Filter out non-gacha operators (IS/Sentry Protocol variants, Reserve Operators)
  const filteredOps = newOps.filter((op) => {
    if (op.cn.includes('卫戍协议')) return false;   // Integrated Strategies variants
    if (op.cn.includes('预备干员')) return false;    // Reserve Operators (non-gacha)
    if (op.cn.includes('盟约·')) return false;      // Alliance operators (non-gacha)
    return true;
  });
  const skippedCount = newOps.length - filteredOps.length;
  if (skippedCount > 0) console.log(`  Filtered out ${skippedCount} non-gacha operators (衛戍協議/預備幹員 etc.)`);

  if (filteredOps.length === 0) {
    console.log('  ✓ No new operators to add.');
    return;
  }

  // Group by rarity
  const byRarity = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
  const skipped = [];

  for (const op of filteredOps) {
    const rarity = op.rarity;
    if (!byRarity[rarity]) { skipped.push(op); continue; }

    // Use explicit twCn if provided, otherwise auto-convert simplified → traditional
    const twCn = op.twCn ?? s2tw(op.cn);

    const imagePath = `./../image/${twCn}/${twCn}-half.png`;
    const approach = mapApproach(op.approach);

    byRarity[rarity].push({
      cn:         twCn,
      en:         op.en || twCn,
      rarity,
      approach:   Array.isArray(approach) ? approach : [approach],
      sort_id:    op.sort_id ?? '',
      image_path: imagePath,
      weight:     1,
    });
  }

  // Prepend new operators to each rarity file (they are newer, go at top)
  for (const [rarity, newEntries] of Object.entries(byRarity)) {
    if (newEntries.length === 0) continue;
    const existing = loadRarityFile(rarity);

    // Deduplicate against existing by English name
    const existingEn = new Set(existing.map((e) => e.en));
    const toAdd = newEntries.filter((e) => !existingEn.has(e.en));

    if (toAdd.length === 0) {
      console.log(`  ★${rarity}: nothing new (all already present)`);
      continue;
    }

    const updated = [...toAdd, ...existing];
    console.log(`  ★${rarity}: adding ${toAdd.length} operators`);
    toAdd.forEach((e) => console.log(`       + ${e.cn} (${e.en})`));
    saveRarityFile(rarity, updated);
  }

  if (skipped.length > 0) {
    console.log(`\n  Skipped (unknown rarity): ${skipped.map((o) => o.cn).join(', ')}`);
  }
}

// ── Mode 2: Sync filteredData.json + official.json from wiki output ───────────
function syncMetaJson() {
  const wikiFilteredPath = join(CRAWL_OUT_DIR, 'filteredData-wiki.json');
  const wikiOfficialPath = join(CRAWL_OUT_DIR, 'official-wiki.json');

  if (!existsSync(wikiFilteredPath) || !existsSync(wikiOfficialPath)) {
    console.error(
      '  ✗ crawl-output/filteredData-wiki.json or official-wiki.json not found.\n' +
      '    Run: node "image crawler/crawl-wiki-data.js" first.',
    );
    process.exit(1);
  }

  const wikiFiltered = readJson(wikiFilteredPath);
  const wikiOfficial = readJson(wikiOfficialPath);

  const existingFiltered = readJson(join(SRC_JSON_DIR, 'filteredData.json'));
  const existingOfficial = readJson(join(SRC_JSON_DIR, 'official.json'));

  // Merge: keep existing entries, prepend any new ones (matched by English name)
  const existingFilteredEn = new Set(existingFiltered.map((e) => e.en));
  const existingOfficialEn = new Set(existingOfficial.map((e) => e.en));

  // Non-gacha filter (same as applyNewOperators)
  function isGachaOperator(op) {
    const cn = op.cn ?? '';
    if (cn.includes('卫戍协议')) return false;
    if (cn.includes('预备干员')) return false;
    if (cn.includes('盟约·')) return false;
    return true;
  }

  const newFiltered = wikiFiltered
    .filter((e) => e.en && !existingFilteredEn.has(e.en) && isGachaOperator(e))
    .map((e) => ({ ...e, cn: s2tw(e.cn) }));

  const newOfficial = wikiOfficial
    .filter((e) => e.en && !existingOfficialEn.has(e.en) && isGachaOperator(e))
    .map((e) => ({ ...e, cn: s2tw(e.cn) }));

  console.log(`  filteredData.json: ${newFiltered.length} new entries`);
  console.log(`  official.json:     ${newOfficial.length} new entries`);

  if (newFiltered.length > 0) {
    writeJson(join(SRC_JSON_DIR, 'filteredData.json'), [...newFiltered, ...existingFiltered]);
  }
  if (newOfficial.length > 0) {
    writeJson(join(SRC_JSON_DIR, 'official.json'), [...newOfficial, ...existingOfficial]);
  }
}

// ── Entry ────────────────────────────────────────────────────────────────────
console.log('=== apply-new-operators.mjs ===');
if (DRY_RUN) console.log('  [DRY-RUN mode — no files will be written]\n');

if (SYNC_META) {
  console.log('\n[Mode: sync-meta] Updating filteredData.json + official.json...');
  syncMetaJson();
} else {
  console.log('\n[Mode: apply] Adding new operators to rarity_N.json...');
  applyNewOperators();
}

console.log('\nDone.');
