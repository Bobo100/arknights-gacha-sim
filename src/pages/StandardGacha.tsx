import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { getCardImage } from '../utils/imageLoader';
import styles from './StandardGacha.module.scss';
import rarity_1 from '../json/rarity_1.json';
import rarity_2 from '../json/rarity_2.json';
import rarity_3 from '../json/rarity_3.json';
import rarity_4 from '../json/rarity_4.json';
import rarity_5 from '../json/rarity_5.json';
import rarity_6 from '../json/rarity_6.json';

const POOL_TYPE = '標準尋訪';

const allCards = [...rarity_1, ...rarity_2, ...rarity_3, ...rarity_4, ...rarity_5, ...rarity_6];
const poolCards = allCards.filter((item) => item.approach.includes(POOL_TYPE));

const BASE_PROBABILITIES: [string, number][] = [
  ['6', 0.02],
  ['5', 0.08],
  ['4', 0.50],
  ['3', 0.40],
];

interface CardData {
  name: string;
  rarity: string;
}

const PITY_THRESHOLD = 50;
const PITY_INCREMENT = 0.02;

function buildProbabilities(guaranteedCount: number): [string, number][] {
  const sixStarProb =
    guaranteedCount > PITY_THRESHOLD
      ? 0.02 + (guaranteedCount - PITY_THRESHOLD) * PITY_INCREMENT
      : 0.02;
  return [
    ['6', sixStarProb],
    ['5', 0.08],
    ['4', 0.50],
    ['3', 0.40],
  ];
}

function weightedRandomCard(rarity: string): CardData {
  const candidates = poolCards.filter((c) => c.rarity === rarity);
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const card of candidates) {
    roll -= card.weight;
    if (roll <= 0) {
      return { name: card.cn, rarity: card.rarity };
    }
  }
  const fallback = candidates[candidates.length - 1];
  return { name: fallback.cn, rarity: fallback.rarity };
}

function drawOne(guaranteedCount: number): { card: CardData; newPityCount: number } {
  const probs = buildProbabilities(guaranteedCount);
  const roll = Math.random();
  let cumulative = 0;

  for (const [rarity, prob] of probs) {
    cumulative += prob;
    if (roll < cumulative) {
      const card = weightedRandomCard(rarity);
      const newPityCount = rarity === '6' ? 0 : guaranteedCount + 1;
      return { card, newPityCount };
    }
  }

  // Fallback (should never hit)
  const card = weightedRandomCard('3');
  return { card, newPityCount: guaranteedCount + 1 };
}

type RarityCount = { '3': number; '4': number; '5': number; '6': number };

interface DrawBatch {
  id: number;
  cards: CardData[];
  batchN: number;         // 1 or 10
  sixStarsBefore: number; // cumulative 6★ before this batch
  totalDrawsBefore: number;
  expanded: boolean;
}

export const StandardGacha = () => {
  const navigate = useNavigate();
  const [latestBatch, setLatestBatch] = useState<CardData[]>([]);
  const [history, setHistory] = useState<DrawBatch[]>([]);
  const [counts, setCounts] = useState<RarityCount>({ '3': 0, '4': 0, '5': 0, '6': 0 });
  const [totalDraws, setTotalDraws] = useState(0);
  const [pityCount, setPityCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  function runDraws(n: number) {
    const newCards: CardData[] = [];
    let pity = pityCount;
    const newCounts = { ...counts };

    for (let i = 0; i < n; i++) {
      const { card, newPityCount } = drawOne(pity);
      pity = newPityCount;
      newCards.push(card);
      newCounts[card.rarity as keyof RarityCount]++;
    }

    const batch: DrawBatch = {
      id: Date.now(),
      cards: newCards,
      batchN: n,
      sixStarsBefore: counts['6'],
      totalDrawsBefore: totalDraws,
      expanded: false,
    };

    setLatestBatch(newCards);
    setHistory((prev) => [batch, ...prev]);
    setCounts(newCounts);
    setTotalDraws((prev) => prev + n);
    setPityCount(pity);
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
  }

  const currentSixStarRate = buildProbabilities(pityCount)[0][1];

  return (
    <div className={styles.drawCard}>
      <button className={styles.btnBack} onClick={() => navigate('/')}>← 返回</button>
      <h1 className={styles.pageTitle}>標準尋訪</h1>
      <p className={styles.poolNote}>常駐標準池．6★ 出現率 2%，50 抽後每抽 +2%</p>

      <div className={styles.btnContainer}>
        <button onClick={() => runDraws(1)} className={styles.btnDraw}>單抽</button>
        <button onClick={() => runDraws(10)} className={styles.btnDrawten}>10 連抽</button>
        <button onClick={handleReset} className={styles.btnReset}>重置</button>
      </div>

      {/* Latest batch */}
      {latestBatch.length > 0 && (
        <div className={styles.resultsSection}>
          <p className={styles.sectionTitle}>最新結果</p>
          <div className={styles.cardList}>
            {latestBatch.map((card, index) => (
              <div key={index} className={styles.cardItem}>
                <img
                  className={cn(styles.cardImg, {
                    [styles.rarity6]: card.rarity === '6',
                    [styles.rarity5]: card.rarity === '5',
                    [styles.rarity4]: card.rarity === '4',
                  })}
                  src={getCardImage(card.name)}
                  alt={card.name}
                />
                <span className={styles.cardName}>{card.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats panel */}
      {totalDraws > 0 && (
        <div className={styles.statsPanel}>
          <span className={styles.statItem}>3★：{counts['3']} 張</span>
          <span className={styles.statItem}>4★：{counts['4']} 張</span>
          <span className={styles.statItem}>5★：{counts['5']} 張</span>
          <span className={cn(styles.statItem, styles.highlight)}>6★：{counts['6']} 張</span>
          <span className={styles.statItem}>共抽 {totalDraws} 次</span>
          <span className={styles.statItem}>保底 {pityCount} 抽</span>
          <span className={cn(styles.statItem, styles.highlight)}>當前 6★ 機率：{(currentSixStarRate * 100).toFixed(1)}%</span>
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
                      </span>
                      <span className={styles.historyArrow}>{batch.expanded ? '▲' : '▼'}</span>
                    </button>
                    {batch.expanded && (
                      <div className={styles.historyCards}>
                        {batch.cards.map((card, i) => (
                          <div key={i} className={styles.cardItem}>
                            <img
                              className={cn(styles.cardImg, {
                                [styles.rarity6]: card.rarity === '6',
                                [styles.rarity5]: card.rarity === '5',
                                [styles.rarity4]: card.rarity === '4',
                              })}
                              src={getCardImage(card.name)}
                              alt={card.name}
                            />
                            <span className={styles.cardName}>{card.name}</span>
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
