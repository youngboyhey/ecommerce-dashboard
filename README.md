# 🛒 CarMall 電商 Dashboard

車魔商城電商數據儀表板 - 整合 Meta 廣告、GA4、Cyberbiz 數據分析

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![Recharts](https://img.shields.io/badge/Recharts-2-8884d8)

## 📊 功能特色

- **營收趨勢圖** - 日/週切換，營收與廣告花費對比
- **Meta 廣告成效** - ROAS、CPA、CTR 分析
- **GA4 轉換漏斗** - 訪客 → 加購 → 結帳 → 購買
- **受眾分析** - 年齡/性別分佈圖表
- **商品銷售排行** - Top 產品營收排名
- **流量來源分析** - 各渠道 Sessions & 轉換率

## 🚀 快速開始

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 啟動生產伺服器
npm start
```

## 📁 專案結構

```
src/
├── app/
│   ├── page.tsx          # 主 Dashboard 頁面
│   ├── layout.tsx        # 根 Layout
│   └── globals.css       # 全域樣式
├── components/
│   ├── KPICard.tsx       # KPI 指標卡片
│   ├── RevenueTrendChart.tsx   # 營收趨勢圖
│   ├── MetaAdsChart.tsx  # Meta 廣告成效
│   ├── GA4Funnel.tsx     # GA4 轉換漏斗
│   ├── AudienceAnalysis.tsx    # 受眾分析
│   ├── ProductRanking.tsx      # 商品排行
│   └── ChannelPerformance.tsx  # 流量來源
└── lib/
    ├── types.ts          # TypeScript 類型定義
    ├── mockData.ts       # 模擬數據
    └── utils.ts          # 工具函數
```

## 🔗 Supabase 整合

詳見 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## 🔄 自動更新機制

詳見 [AUTO_UPDATE.md](./AUTO_UPDATE.md)

## 🛠️ 技術棧

- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **圖表**: Recharts
- **圖標**: Lucide React
- **部署**: Vercel

## 📝 License

MIT License - CarMall © 2026

---

🦞 由龍蝦企業開發
