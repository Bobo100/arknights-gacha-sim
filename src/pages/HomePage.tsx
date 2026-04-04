import React from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import styles from './HomePage.module.scss';

const POOLS = [
  {
    path: '/standard',
    label: '標準尋訪',
    desc: '常駐標準池，6★ 出現率 2%，50 抽後開始提升',
    colorClass: styles.poolStandard,
  },
  {
    path: '/limited',
    label: '限定尋訪',
    desc: '限定角色池，6★ 出現率 2%，保底機制與標準相同',
    colorClass: styles.poolLimited,
  },
] as const;

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.homePage}>
      <h1 className={styles.homeTitle}>明日方舟 模擬抽卡</h1>
      <p className={styles.homeSubtitle}>選擇尋訪類型</p>
      <div className={styles.poolGrid}>
        {POOLS.map((pool) => (
          <button
            key={pool.path}
            className={cn(styles.poolCard, pool.colorClass)}
            onClick={() => navigate(pool.path)}
          >
            <span className={styles.poolLabel}>
              {pool.label}
            </span>
            <span className={styles.poolDesc}>{pool.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
