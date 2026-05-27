# Arknights-Simulation-Card-Draw

模擬明日方舟抽卡機制的網頁應用。

**線上版本：** https://bobo100.github.io/arknights-gacha-sim/

---

## 功能

- **標準尋訪** — 模擬常駐卡池，含保底機制（50 抽後每抽 +2% 機率）
- **限定尋訪** — 13 個歷史限定池，每池顯示主打角色、機率表、陪伴 5★
- **公開招募** — 模擬公招卡池

---

## 技術棧

- React 18 + TypeScript + Vite
- SCSS Modules（`*.module.scss`）
- react-router-dom v6

---

## 開發指令

```bash
npm install       # 安裝依賴
npm run start     # 啟動開發伺服器
npm run build     # 打包生產版本
npm run deploy    # 部署到 GitHub Pages
```

---

## 幹員資料更新流程

資料來源：[PRTS wiki](https://prts.wiki)（中國簡體）和本地繁中對應資料。

### 一鍵同步（推薦）

```bash
npm run sync-all
```

依序執行以下三步：
1. 爬取 PRTS wiki 最新幹員列表與卡池資料
2. 將新幹員合併進 `src/json/official.json` 與 `filteredData.json`
3. 下載所有新幹員的 half 圖片至 `src/image/`

### 分步執行

```bash
# 步驟 1：爬取 wiki（輸出至 crawl-output/）
npm run crawl-wiki

# 步驟 2a：將新幹員套用至 rarity_N.json
npm run apply-operators

# 步驟 2a 預覽模式（不寫入檔案）
npm run apply-operators:dry

# 步驟 2b：同步 filteredData.json + official.json
npm run apply-operators:sync-meta
```

### 手動新增幹員

爬蟲完成後，若有新幹員尚未有繁中名稱：

1. 開啟 `crawl-output/new-operators.json`
2. 為每個新幹員加上 `"twCn"` 欄位（繁體中文名稱）
3. 將對應 half 圖片放至 `src/image/<twCn>/<twCn>-half.png`
4. 執行 `npm run apply-operators`

---

## 抽卡機率

| 稀有度 | 基礎機率 | 保底條件 |
|--------|----------|----------|
| ★★★★★★ | 2% | 第 51 抽起每抽 +2% |
| ★★★★★ | 8% | — |
| ★★★★ | 50% | — |
| ★★★ | 40% | — |

**限定池：** 抽到 6★ 時 70% 機率為主打限定角色。

---

## 專案結構

```
src/
  pages/          # 頁面元件（HomePage, StandardGacha, LimitedGacha, RecruitmentGacha）
  styles/         # 共用 SCSS tokens（_variables.scss, _mixins.scss）
  json/           # 角色資料（rarity_1~6.json, official.json, filteredData.json）
  image/          # 角色 half 圖片
  utils/          # Vite image loader
image crawler/    # 爬蟲腳本（crawl-wiki-data.js, image crawler acd json.js）
scripts/          # 資料更新腳本（apply-new-operators.mjs, update-data.mjs）
crawl-output/     # 爬蟲輸出（git-ignored，執行後產生）
```

