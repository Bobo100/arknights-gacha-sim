import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { getCardImage } from '../utils/imageLoader';
import styles from './RecruitmentGacha.module.scss';

import rarity_1 from '../json/rarity_1.json';
import rarity_2 from '../json/rarity_2.json';
import rarity_3 from '../json/rarity_3.json';
import rarity_4 from '../json/rarity_4.json';
import rarity_5 from '../json/rarity_5.json';
import rarity_6 from '../json/rarity_6.json';

const allCards = [...rarity_1, ...rarity_2, ...rarity_3, ...rarity_4, ...rarity_5, ...rarity_6];
const poolCards = allCards.filter((item) => item.approach.includes('公開招募'));

// Recruitment probabilities (same weights as gacha for simulation purposes)
const BASE_PROBS: [string, number][] = [
  ['6', 0.02],
  ['5', 0.08],
  ['4', 0.50],
  ['3', 0.40],
];

interface CardData {
  name: string;
  rarity: string;
}

function weightedRandomCard(rarity: string): CardData {
  const candidates = poolCards.filter((c) => c.rarity === rarity);
  if (candidates.length === 0) {
    // Fallback to next lower rarity if no candidates at this rarity
    const fallbackRarity = String(Number(rarity) - 1);
    const fallbacks = poolCards.filter((c) => c.rarity === fallbackRarity);
    if (fallbacks.length === 0) {
      return { name: poolCards[0].cn, rarity: poolCards[0].rarity };
    }
    const idx = Math.floor(Math.random() * fallbacks.length);
    return { name: fallbacks[idx].cn, rarity: fallbacks[idx].rarity };
  }
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

function drawOne(): CardData {
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, prob] of BASE_PROBS) {
    cumulative += prob;
    if (roll < cumulative) {
      return weightedRandomCard(rarity);
    }
  }
  return weightedRandomCard('3');
}

type RarityCount = { '3': number; '4': number; '5': number; '6': number };

export const RecruitmentGacha = () => {
  const navigate = useNavigate();
  const [draws, setDraws] = useState<CardData[]>([]);
  const [counts, setCounts] = useState<RarityCount>({ '3': 0, '4': 0, '5': 0, '6': 0 });
  const [totalDraws, setTotalDraws] = useState(0);

  function runDraws(n: number) {
    const newDraws: CardData[] = [];
    const newCounts = { ...counts };

    for (let i = 0; i < n; i++) {
      const card = drawOne();
      newDraws.push(card);
      newCounts[card.rarity as keyof RarityCount]++;
    }

    setDraws(newDraws);
    setCounts(newCounts);
    setTotalDraws((prev) => prev + n);
  }

  function handleReset() {
    setDraws([]);
    setCounts({ '3': 0, '4': 0, '5': 0, '6': 0 });
    setTotalDraws(0);
  }

  return (
    <div className={styles.drawCard}>
      <button className={styles.btnBack} onClick={() => navigate('/')}>← 返回</button>
      <h1 className={styles.pageTitle}>公開招募</h1>
      <p className={styles.poolNote}>基礎招募，最高 5★，無保底機制</p>

      <div className={styles.btnContainer}>
        <button onClick={() => runDraws(1)} className={styles.btnDraw}>單抽</button>
        <button onClick={() => runDraws(10)} className={styles.btnDrawten}>10 連抽</button>
        <button onClick={handleReset} className={styles.btnReset}>重置</button>
      </div>

      {draws.length > 0 && (
        <div className={styles.resultsSection}>
          <p className={styles.sectionTitle}>招募結果</p>
          <div className={styles.cardList}>
            {draws.map((card, index) => (
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

      {totalDraws > 0 && (
        <div className={styles.statsPanel}>
          <span className={styles.statItem}>3★：{counts['3']} 張</span>
          <span className={styles.statItem}>4★：{counts['4']} 張</span>
          <span className={cn(styles.statItem, styles.highlight)}>5★：{counts['5']} 張</span>
          <span className={styles.statItem}>共抽 {totalDraws} 次</span>
        </div>
      )}
    </div>
  );
};
