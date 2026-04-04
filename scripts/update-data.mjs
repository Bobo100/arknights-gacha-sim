/**
 * scripts/update-data.mjs
 *
 * Fetches character and gacha data from Kengxxiao/ArknightsGameData_YoStar
 * (JP server, archived Dec 2025 — last available data for YoStar/TW server).
 *
 * Usage:
 *   npm run update-data
 *
 * What it does:
 *  1. Downloads character_table.json and gacha_table.json from the JP repo.
 *  2. Identifies all obtainable characters and their rarity.
 *  3. Identifies limited characters from LIMITED-type pool entries.
 *  4. Compares with the existing rarity_N.json files in src/json/.
 *  5. Reports differences and writes a pending-characters.json file
 *     listing any new characters that need manual TW-name + image work.
 *
 * To add a new character after running this script:
 *  1. Identify the Traditional Chinese name (from in-game TW client or PRTS wiki).
 *  2. Add an entry to the appropriate src/json/rarity_N.json.
 *  3. Add the character's half-art image to src/image/<TW-name>/<TW-name>-half.png.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ja_JP/gamedata/excel';

const JSON_DIR = join(__dirname, '../src/json');
const PENDING_FILE = join(__dirname, 'pending-characters.json');

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json();
}

function loadExistingData() {
  const byRarity = {};
  for (let r = 1; r <= 6; r++) {
    const filePath = join(JSON_DIR, `rarity_${r}.json`);
    byRarity[String(r)] = JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return byRarity;
}

function buildExistingCharacterSet(byRarity) {
  // Build a rough count per rarity → we can't map by ID since existing data has no charId field
  const countByRarity = {};
  const approachByRarity = {};
  for (const [rarity, entries] of Object.entries(byRarity)) {
    countByRarity[rarity] = entries.length;
    approachByRarity[rarity] = {
      standard: entries.filter((e) => e.approach.includes('標準尋訪')).length,
      limited: entries.filter((e) => e.approach.includes('限定尋訪')).length,
      recruitment: entries.filter((e) => e.approach.includes('公開招募')).length,
    };
  }
  return { countByRarity, approachByRarity };
}

const NON_OBTAINABLE_PROFESSIONS = new Set(['TOKEN', 'TRAP']);

function isObtainableCharacter(charId, charData) {
  if (charData.isNotObtainable) return false;
  if (NON_OBTAINABLE_PROFESSIONS.has(charData.profession)) return false;
  if (charId.startsWith('token_')) return false;
  return true;
}

function extractLimitedCharIds(gachaTable) {
  const limitedIds = new Set();
  for (const pool of gachaTable.gachaPoolClient) {
    if (pool.gachaRuleType === 'LIMITED' && pool.limitParam?.limitedCharId) {
      limitedIds.add(pool.limitParam.limitedCharId);
    }
    // FESCLASSIC pools sometimes have limited chars in dynMeta
    if (
      (pool.gachaRuleType === 'FESCLASSIC' || pool.gachaRuleType === 'DOUBLE') &&
      pool.limitParam?.limitedCharId
    ) {
      limitedIds.add(pool.limitParam.limitedCharId);
    }
  }
  return limitedIds;
}

function inferApproach(charId, displayRarity, isLimited, charData) {
  if (isLimited) {
    return ['限定尋訪'];
  }
  // Characters with tagList can appear in recruitment (公開招募)
  // In Arknights, recruitment is limited to chars with specific tags
  // Typically rarity 3★-6★ can appear in recruitment if they have qualifying tags
  const hasTags = charData.tagList && charData.tagList.length > 0;

  if (displayRarity <= 2) {
    // 1★-2★ are typically only from recruitment or event (rarely standard gacha)
    return hasTags ? ['公開招募'] : ['活動獲得'];
  }
  if (displayRarity === 3) {
    return hasTags ? ['公開招募', '標準尋訪'] : ['標準尋訪'];
  }
  if (displayRarity === 4) {
    return hasTags ? ['公開招募', '標準尋訪'] : ['標準尋訪'];
  }
  // 5★ and 6★ non-limited go into standard
  return ['標準尋訪'];
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Arknights Data Updater (JP/YoStar source)');
  console.log('═══════════════════════════════════════════\n');

  console.log('Fetching game data from GitHub...');
  const [charTable, gachaTable] = await Promise.all([
    fetchJson(`${BASE_URL}/character_table.json`),
    fetchJson(`${BASE_URL}/gacha_table.json`),
  ]);
  console.log(`  ✓ character_table: ${Object.keys(charTable).length} total entries`);
  console.log(`  ✓ gacha_table: ${gachaTable.gachaPoolClient.length} pool entries\n`);

  // Load existing data
  const existingByRarity = loadExistingData();
  const { countByRarity, approachByRarity } = buildExistingCharacterSet(existingByRarity);

  // Extract limited char IDs from gacha pool history
  const limitedCharIds = extractLimitedCharIds(gachaTable);
  console.log(`  Limited characters in JP gacha history: ${limitedCharIds.size}`);

  // Find the most recent NORMAL (standard) pool entry for context
  const normalPools = gachaTable.gachaPoolClient.filter(
    (p) => p.gachaRuleType === 'NORMAL' || p.gachaRuleType === 'SINGLE',
  );
  if (normalPools.length > 0) {
    const latest = normalPools[normalPools.length - 1];
    console.log(`  Latest standard pool: "${latest.gachaPoolName}" (ID: ${latest.gachaPoolId})\n`);
  }

  // Build JP character list (obtainable only)
  const jpCharsByRarity = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };

  for (const [charId, charData] of Object.entries(charTable)) {
    if (!isObtainableCharacter(charId, charData)) continue;
    const displayRarity = String(charData.rarity + 1);
    if (!jpCharsByRarity[displayRarity]) continue;

    const isLimited = limitedCharIds.has(charId);
    const approach = inferApproach(charId, Number(displayRarity), isLimited, charData);

    jpCharsByRarity[displayRarity].push({
      charId,
      jpName: charData.name,
      rarity: displayRarity,
      approach,
      isLimited,
      profession: charData.profession,
      tagList: charData.tagList ?? [],
    });
  }

  // Compare with existing data
  console.log('Character count comparison:');
  console.log('  Rarity │ JP server │ Local │  Diff  │ Notes');
  console.log('  ───────┼───────────┼───────┼────────┼──────────────────────────');

  const pendingChars = [];

  for (let r = 6; r >= 1; r--) {
    const rStr = String(r);
    const jpCount = jpCharsByRarity[rStr].length;
    const localCount = countByRarity[rStr] ?? 0;
    const diff = jpCount - localCount;
    const sign = diff >= 0 ? '+' : '';
    const notes = diff > 0 ? `⚠ ${diff} potentially new` : diff < 0 ? 'local has more (event/story?)' : 'up to date';
    console.log(
      `  ${r}★     │    ${String(jpCount).padStart(5)}  │  ${String(localCount).padStart(4)} │ ${(sign + diff).padStart(6)}  │ ${notes}`,
    );

    if (diff > 0) {
      // We can't perfectly identify WHICH chars are new without charId in local data.
      // Report the last `diff` chars from JP by profession/rarity as candidates.
      const candidates = jpCharsByRarity[rStr].slice(localCount);
      pendingChars.push(...candidates);
    }
  }

  // Pool approach breakdown for 6★
  const jp6Limited = jpCharsByRarity['6'].filter((c) => c.isLimited).length;
  const jp6Standard = jpCharsByRarity['6'].filter((c) => !c.isLimited).length;
  const local6 = approachByRarity['6'];

  console.log('\n6★ pool breakdown:');
  console.log(`  JP limited:   ${jp6Limited} | Local limited:   ${local6.limited}`);
  console.log(`  JP standard:  ${jp6Standard} | Local standard:  ${local6.standard}`);
  if (jp6Limited > local6.limited) {
    console.log(`\n  ⚠ ${jp6Limited - local6.limited} new limited 6★ in JP data:`);
    const newLimited = jpCharsByRarity['6']
      .filter((c) => c.isLimited)
      .slice(local6.limited);
    for (const c of newLimited) {
      console.log(`    charId: ${c.charId}  JP name: ${c.jpName}`);
    }
  }

  if (jp6Standard > local6.standard) {
    console.log(`\n  ⚠ ${jp6Standard - local6.standard} new standard 6★ in JP data:`);
    const newStd = jpCharsByRarity['6']
      .filter((c) => !c.isLimited)
      .slice(local6.standard);
    for (const c of newStd) {
      console.log(`    charId: ${c.charId}  JP name: ${c.jpName}`);
    }
  }

  // Write pending characters file
  if (pendingChars.length > 0) {
    const pendingOutput = pendingChars.map((c) => ({
      charId: c.charId,
      jpName: c.jpName,
      cn: '(需要填入繁體中文名稱)',
      en: '(需要填入英文名稱)',
      rarity: c.rarity,
      approach: c.approach,
      sort_id: '(需要填入)',
      image_path: '(需要填入圖片路徑)',
      weight: 1,
      isLimited: c.isLimited,
      profession: c.profession,
      tagList: c.tagList,
    }));

    writeFileSync(PENDING_FILE, JSON.stringify(pendingOutput, null, 4), 'utf-8');
    console.log(`\nPending characters saved to: scripts/pending-characters.json`);
    console.log('To add a new character:');
    console.log('  1. Fill in "cn" (繁體中文名稱) and "en" fields in pending-characters.json');
    console.log('  2. Copy the entry to the matching src/json/rarity_N.json file');
    console.log('  3. Add image: src/image/<cn-name>/<cn-name>-half.png');
  } else {
    console.log('\n✓ No new characters detected — local data appears current.');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Done. src/json files were NOT modified.');
  console.log('  Review pending-characters.json then update manually.');
  console.log('═══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
