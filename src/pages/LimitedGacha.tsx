import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { getCardImage } from '../utils/imageLoader';
import styles from './LimitedGacha.module.scss';

import rarity_1 from '../json/rarity_1.json';
import rarity_2 from '../json/rarity_2.json';
import rarity_3 from '../json/rarity_3.json';
import rarity_4 from '../json/rarity_4.json';
import rarity_5 from '../json/rarity_5.json';
import rarity_6 from '../json/rarity_6.json';

// ── Data ────────────────────────────────────────────────
const allCards = [
  ...rarity_1, ...rarity_2, ...rarity_3,
  ...rarity_4, ...rarity_5, ...rarity_6,
];

const standard6Pool = allCards.filter(
  (c) => c.rarity === '6' && c.approach.includes('標準尋訪'),
);
const standard5Pool = allCards.filter(
  (c) => c.rarity === '5' && c.approach.includes('標準尋訪'),
);
const standard4Pool = allCards.filter(
  (c) => c.rarity === '4' && c.approach.includes('標準尋訪'),
);
const standard3Pool = allCards.filter(
  (c) => c.rarity === '3' && c.approach.includes('標準尋訪'),
);

// ── Banner definitions (newest → oldest) ───────────────
interface LimitedBannerDef {
  readonly id: string;
  readonly limitedChar6: string;             // New limited 6★ (debut)
  readonly companion6List: readonly string[]; // Returning featured limited 6★ (same 70% pool)
  readonly companion5List: readonly string[]; // Collab-exclusive limited 5★ companions
  readonly bannerName: string;
}

const LIMITED_BANNERS: readonly LimitedBannerDef[] = [
  // ── 2026 ──────────────────────────────────────────────────────────────────
  { id: 'wang',        limitedChar6: '望',           companion6List: ['赤刃明霄陳'],  companion5List: [],                     bannerName: '新春限定・望' },
  // ── 2025 ──────────────────────────────────────────────────────────────────
  { id: 'silverash2',  limitedChar6: '凜御銀灰',     companion6List: ['聖聆初雪'],    companion5List: [],                     bannerName: '慶典限定・凜御銀灰' },
  { id: 'bangdream',   limitedChar6: '豐川祥子',     companion6List: [],              companion5List: ['三角初華', '若葉睦'],  bannerName: '聯動・人偶的歌謠' },
  { id: 'hoshiguma2',  limitedChar6: '斬業星熊',     companion6List: ['遙'],          companion5List: [],                     bannerName: '夏季限定・斬業星熊' },
  { id: 'exusiai2',    limitedChar6: '新約能天使',   companion6List: ['蕾繆安'],      companion5List: [],                     bannerName: '慶典限定・新約能天使' },
  { id: 'blaze2',      limitedChar6: '燭煌',         companion6List: ['餘'],          companion5List: [],                     bannerName: '新春限定・燭煌' },
  // ── 2024 ──────────────────────────────────────────────────────────────────
  { id: 'lappland2',   limitedChar6: '荒蕪拉普蘭德', companion6List: ['忍冬'],        companion5List: [],                     bannerName: '慶典限定・荒蕪拉普蘭德' },
  { id: 'dunmeshi',    limitedChar6: '瑪露西爾',     companion6List: [],              companion5List: ['萊歐斯', '齊爾查克'], bannerName: '聯動・迷宮飯' },
  { id: 'pepe',        limitedChar6: '佩佩',         companion6List: ['娜仁圖亞'],    companion5List: [],                     bannerName: '夏季限定・佩佩' },
  { id: 'wisadel',     limitedChar6: '維什戴爾',     companion6List: ['邏各斯'],      companion5List: [],                     bannerName: '慶典限定・維什戴爾' },
  { id: 'r6rerun',     limitedChar6: '灰燼',         companion6List: [],              companion5List: ['霜華', '閃擊'],        bannerName: '彩虹六號聯動・復刻' },
  { id: 'ela',         limitedChar6: '艾拉',         companion6List: [],              companion5List: ['醫生', '雙月'],        bannerName: '彩虹六號聯動・艾拉' },
  { id: 'shu',         limitedChar6: '黍',           companion6List: ['左樂'],        companion5List: [],                     bannerName: '新春限定・黍' },
  // ── 2023 ──────────────────────────────────────────────────────────────────
  { id: 'virtuosa',    limitedChar6: '塑心',         companion6List: ['薇薇安娜'],    companion5List: [],                     bannerName: '慶典限定・塑心' },
  { id: 'eyja2',       limitedChar6: '純燼艾雅法拉', companion6List: ['琳琅詩懷雅'], companion5List: [],                     bannerName: '夏季限定・純燼艾雅法拉' },
  { id: 'muelsyse',    limitedChar6: '繆爾賽思',     companion6List: ['霍爾海雅'],    companion5List: [],                     bannerName: '慶典限定・繆爾賽思' },
  { id: 'monsterhunt', limitedChar6: '麒麟X夜刀',   companion6List: [],              companion5List: ['火龍S黑角'],           bannerName: '魔物獵人聯動・砺火成錋' },
  { id: 'chongyue',    limitedChar6: '重嶽',         companion6List: ['林'],          companion5List: [],                     bannerName: '新春限定・重嶽' },
  // ── 2022 ──────────────────────────────────────────────────────────────────
  { id: 'texas2',      limitedChar6: '緘默德克薩斯', companion6List: ['斥罪'],        companion5List: [],                     bannerName: '慶典限定・緘默德克薩斯' },
  { id: 'gavial2',     limitedChar6: '百鍊嘉維爾',   companion6List: ['鴻雪'],        companion5List: [],                     bannerName: '夏季限定・百鍊嘉維爾' },
  { id: 'specter2',    limitedChar6: '歸溟幽靈鯊',   companion6List: ['艾麗妮'],      companion5List: [],                     bannerName: '慶典限定・歸溟幽靈鯊' },
  { id: 'ling',        limitedChar6: '令',           companion6List: ['老鯉'],        companion5List: [],                     bannerName: '新春限定・令' },
  // ── 2021 ──────────────────────────────────────────────────────────────────
  { id: 'nearl2',      limitedChar6: '耀騎士臨光',   companion6List: ['焰尾'],        companion5List: [],                     bannerName: '慶典限定・耀騎士臨光' },
  { id: 'chen2',       limitedChar6: '假日威龍陳',   companion6List: ['水月'],        companion5List: [],                     bannerName: '夏日限定・假日威龍陳' },
  { id: 'skadi2',      limitedChar6: '濁心斯卡蒂',   companion6List: ['凱爾希'],      companion5List: [],                     bannerName: '慶典限定・濁心斯卡蒂' },
  { id: 'ash',         limitedChar6: '灰燼',         companion6List: [],              companion5List: ['霜華', '閃擊'],        bannerName: '彩虹六號聯動・灰燼' },
  { id: 'dusk',        limitedChar6: '夕',           companion6List: ['嵯峨'],        companion5List: [],                     bannerName: '新春限定・夕' },
  // ── 2020 ──────────────────────────────────────────────────────────────────
  { id: 'rosmontis',   limitedChar6: '迷迭香',       companion6List: ['泥岩'],        companion5List: [],                     bannerName: '慶典限定・迷迭香' },
  { id: 'w',           limitedChar6: 'W',            companion6List: ['溫蒂'],        companion5List: [],                     bannerName: '慶典限定・W' },
  { id: 'nian',        limitedChar6: '年',           companion6List: ['阿'],          companion5List: [],                     bannerName: '新春限定・年' },
];


// ── Constants ────────────────────────────────────────────
const PITY_THRESHOLD = 50;
const PITY_INCREMENT = 0.02;
const BASE_SIX_RATE = 0.02;
const BASE_FIVE_RATE = 0.08;
const BASE_FOUR_RATE = 0.50;
const BASE_THREE_RATE = 0.40;
/** Fraction of 6★ draws that yield the featured limited character */
const LIMITED_SIX_PICKUP_RATE = 0.70;
/** Fraction of 5★ draws that yield the companion limited 5★ (if any) */
const LIMITED_FIVE_PICKUP_RATE = 0.70;

// ── Types ────────────────────────────────────────────────
interface CardData {
  readonly name: string;
  readonly rarity: string;
  readonly isLimited: boolean;
}

type RarityCount = { '3': number; '4': number; '5': number; '6': number };

// ── Helpers ──────────────────────────────────────────────
function buildSixStarProb(pity: number): number {
  return pity > PITY_THRESHOLD ? BASE_SIX_RATE + (pity - PITY_THRESHOLD) * PITY_INCREMENT : BASE_SIX_RATE;
}

function weightedRandom<T extends { weight: number }>(pool: T[]): T {
  const total = pool.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * total;
  for (const card of pool) {
    roll -= card.weight;
    if (roll <= 0) return card;
  }
  return pool[pool.length - 1];
}

function drawOne(pity: number, banner: LimitedBannerDef): { card: CardData; newPity: number } {
  const sixStarProb = buildSixStarProb(pity);
  const roll = Math.random();
  let cum = 0;

  // Determine rarity from roll
  let rarity: string;
  for (const [r, p] of [
    ['6', sixStarProb],
    ['5', BASE_FIVE_RATE],
    ['4', BASE_FOUR_RATE],
    ['3', BASE_THREE_RATE],
  ] as [string, number][]) {
    cum += p;
    if (roll < cum) { rarity = r; break; }
  }
  rarity ??= '3';

  const newPity = rarity === '6' ? 0 : pity + 1;

  // 6★ — 70% → one of ALL featured limited 6★ (main + returning), 30% → standard
  if (rarity === '6') {
    const allLimited6 = [banner.limitedChar6, ...banner.companion6List];
    if (Math.random() < LIMITED_SIX_PICKUP_RATE) {
      const picked = allLimited6[Math.floor(Math.random() * allLimited6.length)];
      return { card: { name: picked, rarity: '6', isLimited: true }, newPity };
    }
    const picked = weightedRandom(standard6Pool);
    return { card: { name: picked.cn, rarity: '6', isLimited: false }, newPity };
  }

  // 5★ — 70% → companion limited 5★ (if any), else standard 5★
  if (rarity === '5') {
    if (banner.companion5List.length > 0 && Math.random() < LIMITED_FIVE_PICKUP_RATE) {
      const idx = Math.floor(Math.random() * banner.companion5List.length);
      return { card: { name: banner.companion5List[idx], rarity: '5', isLimited: true }, newPity };
    }
    const picked = weightedRandom(standard5Pool);
    return { card: { name: picked.cn, rarity: '5', isLimited: false }, newPity };
  }

  if (rarity === '4') {
    const picked = weightedRandom(standard4Pool);
    return { card: { name: picked.cn, rarity: '4', isLimited: false }, newPity };
  }

  const picked = weightedRandom(standard3Pool);
  return { card: { name: picked.cn, rarity: '3', isLimited: false }, newPity };
}

// ── Sub-components ───────────────────────────────────────

interface BannerSelectViewProps {
  onSelect: (banner: LimitedBannerDef) => void;
  onBack: () => void;
}

const BannerSelectView = ({ onSelect, onBack }: BannerSelectViewProps) => (
  <div className={styles.limitedPage}>
    <div className={styles.bannerSelectHeader}>
      <div className={styles.bannerSelectTop}>
        <button className={styles.btnBackLim} onClick={onBack}>← 返回首頁</button>
        <span className={styles.bannerCount}>
          共 {LIMITED_BANNERS.length} 個限定池
        </span>
      </div>
      <h1>限定尋訪</h1>
      <p>選擇要模擬的限定池</p>
    </div>
    <div className={styles.bannerGrid}>
      {LIMITED_BANNERS.map((banner) => (
        <button key={banner.id} className={styles.bannerCard} onClick={() => onSelect(banner)}>
          <img
            className={styles.bannerThumb}
            src={getCardImage(banner.limitedChar6)}
            alt={banner.limitedChar6}
          />
          <div className={styles.bannerCardInfo}>
            <div className={styles.bannerCardTitle}>限定尋訪</div>
            <div className={styles.bannerCardName}>{banner.limitedChar6}</div>
            <div className={styles.bannerCardSub}>{banner.bannerName}</div>
            {banner.companion5List.length > 0 && (
              <div className={styles.bannerCardCompanion}>
                搭配 5★：{banner.companion5List.join('、')}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
);

interface DrawBatch {
  id: number;
  cards: CardData[];
  batchN: number;
  totalDrawsBefore: number;
  expanded: boolean;
}

interface GachaViewProps {
  banner: LimitedBannerDef;
  onChangeBanner: () => void;
  onBack: () => void;
}

const GachaView = ({ banner, onChangeBanner, onBack }: GachaViewProps) => {
  const [latestBatch, setLatestBatch] = useState<CardData[]>([]);
  const [history, setHistory] = useState<DrawBatch[]>([]);
  const [counts, setCounts] = useState<RarityCount>({ '3': 0, '4': 0, '5': 0, '6': 0 });
  const [totalDraws, setTotalDraws] = useState(0);
  const [pityCount, setPityCount] = useState(0);
  const [limitedCount, setLimitedCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  function runDraws(n: number) {
    const newCards: CardData[] = [];
    let pity = pityCount;
    const newCounts = { ...counts };
    let newLimitedCount = limitedCount;

    for (let i = 0; i < n; i++) {
      const { card, newPity } = drawOne(pity, banner);
      pity = newPity;
      newCards.push(card);
      newCounts[card.rarity as keyof RarityCount]++;
      if (card.isLimited) newLimitedCount++;
    }

    const batch: DrawBatch = {
      id: Date.now(),
      cards: newCards,
      batchN: n,
      totalDrawsBefore: totalDraws,
      expanded: false,
    };

    setLatestBatch(newCards);
    setHistory((prev) => [batch, ...prev]);
    setCounts(newCounts);
    setTotalDraws((prev) => prev + n);
    setPityCount(pity);
    setLimitedCount(newLimitedCount);
  }

  function toggleBatch(id: number) {
    setHistory((prev) =>
      prev.map((b) => (b.id === id ? { ...b, expanded: !b.expanded } : b)),
    );
  }

  function handleReset() {
    setLatestBatch([]);
    setHistory([]);
    setCounts({ '3': 0, '4': 0, '5': 0, '6': 0 });
    setTotalDraws(0);
    setPityCount(0);
    setLimitedCount(0);
  }

  const currentSixStarRate = buildSixStarProb(pityCount);
  const pctOf = (n: number) => totalDraws > 0 ? (n / totalDraws * 100).toFixed(1) : '0.0';

  return (
    <div className={styles.limitedPage}>
      {/* Header */}
      <div className={styles.gachaHeader}>
        <button className={styles.btnBackLim} onClick={onBack}>← 首頁</button>
        <h1>{banner.bannerName}</h1>
        <button className={styles.btnBannerSelect} onClick={onChangeBanner}>切換池子 ↓</button>
      </div>

      {/* Featured character + rate table */}
      <div className={styles.featuredSection}>
        <div className={styles.featuredImgWrap}>
          <img
            className={styles.featuredImg}
            src={getCardImage(banner.limitedChar6)}
            alt={banner.limitedChar6}
          />
          <span className={styles.featuredLabel}>主打角色</span>
        </div>

        <div className={styles.featuredInfo}>
          <div className={styles.featuredName}>{banner.limitedChar6}</div>
          <div className={styles.featuredDesc}>
            限定 6★　｜　在 6★ 中佔 {(LIMITED_SIX_PICKUP_RATE * 100).toFixed(0)}% 的出率
          </div>
          {banner.companion6List.length > 0 && (
            <div className={styles.companionRow}>
              <span className={styles.companionLabel}>同期陪跑限定 6★：</span>
              {banner.companion6List.map((name) => (
                <span key={name} className={styles.companionTag}>
                  <img src={getCardImage(name)} alt={name} className={styles.companionThumb} />
                  {name}
                </span>
              ))}
              <span className={styles.companionRate}>（與主角平分 {(LIMITED_SIX_PICKUP_RATE * 100).toFixed(0)}%）</span>
            </div>
          )}
          {banner.companion5List.length > 0 && (
            <div className={styles.companionRow}>
              <span className={styles.companionLabel}>搭配限定 5★：</span>
              {banner.companion5List.map((name) => (
                <span key={name} className={styles.companionTag}>
                  <img
                    src={getCardImage(name)}
                    alt={name}
                    className={styles.companionThumb}
                  />
                  {name}
                </span>
              ))}
              <span className={styles.companionRate}>
                （5★ 中佔 {(LIMITED_FIVE_PICKUP_RATE * 100).toFixed(0)}%）
              </span>
            </div>
          )}
        </div>

        {/* Rate panel */}
        <div className={styles.ratePanel}>
          <h3>卡察（尋訪機率）</h3>
          <table className={styles.rateTable}>
            <tbody>
              <tr>
                <td className={cn(styles.rateStarCell, styles.star6)}>6 ★</td>
                <td className={styles.ratePct}>2.00 %</td>
                <td className={styles.rateHint}>50 抽後每抽 +2%</td>
              </tr>
              <tr>
                <td className={cn(styles.rateStarCell, styles.star5)}>5 ★</td>
                <td className={styles.ratePct}>8.00 %</td>
                <td></td>
              </tr>
              <tr>
                <td className={cn(styles.rateStarCell, styles.star4)}>4 ★</td>
                <td className={styles.ratePct}>50.00 %</td>
                <td></td>
              </tr>
              <tr>
                <td className={cn(styles.rateStarCell, styles.star3)}>3 ★</td>
                <td className={styles.ratePct}>40.00 %</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div className={styles.rateNote}>
            · 限定角色不進入常駐池<br />
            · 保底：50 抽後，每多抽 1 次，6★ 機率 +2%
          </div>
          {totalDraws > 0 && (
            <div className={styles.pityCurrent}>
              當前連續未出 6★：{pityCount} 抽<br />
              目前 6★ 機率：{(currentSixStarRate * 100).toFixed(1)} %
            </div>
          )}
        </div>
      </div>

      {/* Draw results — latest batch */}
      <div className={styles.drawSection}>
        <h2>最近 {latestBatch.length > 0 ? latestBatch.length : ''} 抽結果</h2>
        <div className={styles.cardListLim}>
          {latestBatch.length === 0 && (
            <span className={styles.noDrawsPlaceholder}>
              尚未抽卡
            </span>
          )}
          {latestBatch.map((card, index) => (
            <div key={index} className={styles.cardItem}>
              <img
                className={cn(styles.cardImgLim, {
                  [styles.star6]: card.rarity === '6',
                  [styles.star5]: card.rarity === '5',
                  [styles.star4]: card.rarity === '4',
                  [styles.isLimited]: card.isLimited,
                })}
                src={getCardImage(card.name)}
                alt={card.name}
              />
              <span className={styles.cardNameLim}>{card.name}</span>
              {card.isLimited && <span className={styles.limitedBadge}>★ 限定</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className={styles.btnContainerLim}>
        <button onClick={() => runDraws(1)} className={styles.btnDrawLim}>單 抽</button>
        <button onClick={() => runDraws(10)} className={styles.btnDrawtenLim}>10 連抽</button>
        <button onClick={handleReset} className={styles.btnResetLim}>重置</button>
      </div>

      {/* Stats */}
      {totalDraws > 0 && (
        <div className={styles.statsSection}>
          <div className={styles.statsBlock}>
            <h3>抽卡次數統計</h3>
            <ul>
              <li>6★：{counts['6']} 張（{pctOf(counts['6'])} %）</li>
              <li>5★：{counts['5']} 張（{pctOf(counts['5'])} %）</li>
              <li>4★：{counts['4']} 張（{pctOf(counts['4'])} %）</li>
              <li>3★：{counts['3']} 張（{pctOf(counts['3'])} %）</li>
              <li>合計：{totalDraws} 次</li>
            </ul>
          </div>
          <div className={styles.statsBlock}>
            <h3>限定角色</h3>
            <ul>
              <li>限定幹員共：{limitedCount} 張</li>
              <li>{banner.limitedChar6} 出率：{pctOf(limitedCount)} %</li>
              {totalDraws >= 50 && counts['6'] === 0 && (
                <li className={styles.warningText}>⚠ 50 抽未出 6★，保底已提升</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* History log */}
      {history.length > 1 && (
        <div className={styles.historySection}>
          <button
            className={styles.historyToggle}
            onClick={() => setHistoryOpen((o) => !o)}
          >
            {historyOpen ? '▲' : '▼'} 歷史紀錄（{history.length} 批次）
          </button>
          {historyOpen && (
            <div className={styles.historyList}>
              {history.map((batch, bIdx) => {
                const sixInBatch = batch.cards.filter((c) => c.rarity === '6').length;
                const fiveInBatch = batch.cards.filter((c) => c.rarity === '5').length;
                const limitedInBatch = batch.cards.filter((c) => c.isLimited).length;
                const label = bIdx === 0 ? '（最新）' : '';
                return (
                  <div key={batch.id} className={styles.historyRow}>
                    <button
                      className={styles.historyRowHeader}
                      onClick={() => toggleBatch(batch.id)}
                    >
                      <span className={styles.historyBatchNo}>第 {history.length - bIdx} 批</span>
                      <span className={styles.historyBatchLabel}>{batch.batchN} 抽{label}</span>
                      <span className={styles.historyBatchStats}>
                        {sixInBatch > 0 && <span className={styles.tag6}>6★×{sixInBatch}</span>}
                        {fiveInBatch > 0 && <span className={styles.tag5}>5★×{fiveInBatch}</span>}
                        {limitedInBatch > 0 && <span className={styles.tagLimited}>限定×{limitedInBatch}</span>}
                      </span>
                      <span className={styles.historyArrow}>{batch.expanded ? '▲' : '▼'}</span>
                    </button>
                    {batch.expanded && (
                      <div className={styles.historyCards}>
                        {batch.cards.map((card, i) => (
                          <div key={i} className={styles.cardItem}>
                            <img
                              className={cn(styles.cardImgLim, {
                                [styles.star6]: card.rarity === '6',
                                [styles.star5]: card.rarity === '5',
                                [styles.star4]: card.rarity === '4',
                                [styles.isLimited]: card.isLimited,
                              })}
                              src={getCardImage(card.name)}
                              alt={card.name}
                            />
                            <span className={styles.cardNameLim}>{card.name}</span>
                            {card.isLimited && <span className={styles.limitedBadge}>★ 限定</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────
export const LimitedGacha = () => {
  const navigate = useNavigate();
  const [selectedBanner, setSelectedBanner] = useState<LimitedBannerDef | null>(null);

  if (selectedBanner === null) {
    return (
      <BannerSelectView
        onSelect={setSelectedBanner}
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <GachaView
      banner={selectedBanner}
      onChangeBanner={() => setSelectedBanner(null)}
      onBack={() => navigate('/')}
    />
  );
};
