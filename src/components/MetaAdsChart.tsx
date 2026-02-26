'use client';

import { memo, useMemo } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Target } from 'lucide-react';
import { tooltipWrapperStyle, tooltipContentStyle } from './ChartTooltipWrapper';

interface AdData {
  name: string;
  ad_id?: string;
  spend: number;
  ctr: number;
  roas: number;
  purchases: number;
  cpa: number;
  cpc: number;
  cvr: number;
  clicks: number;
  conv_value: number;  // 廣告帶來的營收
}

interface MetaAdsChartProps {
  ads?: AdData[];
}

// ROAS 顏色判斷
const getRoasColor = (roas: number): string => {
  if (roas < 1) return '#EF4444';     // 紅色 - 虧損
  if (roas < 1.5) return '#F59E0B';   // 黃色 - 邊緣
  return '#10B981';                    // 綠色 - 獲利
};

const getRoasTextColor = (roas: number): string => {
  if (roas < 1) return 'text-red-600';
  if (roas < 1.5) return 'text-amber-600';
  return 'text-emerald-600';
};

// 自訂 Tooltip
interface TooltipPayload {
  name: string;
  spend: number;
  roas: number;
  purchases: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cvr: number;
  clicks: number;
  conv_value: number;
}

const CustomTooltip = ({ active, payload }: { 
  active?: boolean; 
  payload?: Array<{ payload: TooltipPayload }>;
}) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-white rounded-xl p-4 shadow-xl border border-gray-100 min-w-[200px]">
      <p className="font-semibold text-gray-900 mb-2 text-sm truncate max-w-[180px]" title={data.name}>
        {data.name}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">花費</span>
          <span className="font-mono font-medium text-gray-900">{formatCurrency(data.spend)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ROAS</span>
          <span className={`font-mono font-bold ${getRoasTextColor(data.roas)}`}>{data.roas.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">轉換數</span>
          <span className="font-mono font-medium text-gray-900">{data.purchases}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">CTR</span>
          <span className="font-mono font-medium text-gray-900">{data.ctr.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">CPC</span>
          <span className="font-mono font-medium text-gray-900">{formatCurrency(data.cpc)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">CVR</span>
          <span className="font-mono font-medium text-gray-900">{data.cvr.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">購買數</span>
          <span className="font-mono font-medium text-gray-900">{data.purchases}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">購買價值</span>
          <span className="font-mono font-medium text-gray-900">NT${data.conv_value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">CPA</span>
          <span className="font-mono font-medium text-gray-900">{formatCurrency(data.cpa)}</span>
        </div>
      </div>
    </div>
  );
};

// Gauge 卡片組件
const GaugeCard = memo(function GaugeCard({ campaign }: { campaign: AdData }) {
  const roasValue = Math.min(campaign.roas, 3); // 最大顯示 3
  const roasPercent = (roasValue / 3) * 100;
  const color = getRoasColor(campaign.roas);
  
  const gaugeData = [
    { name: 'roas', value: roasPercent, fill: color }
  ];

  return (
    <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Campaign Name */}
      <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate mb-2" title={campaign.name}>
        {campaign.name}
      </p>
      
      {/* Gauge Chart - 半圓 */}
      <div className="h-16 sm:h-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="90%"
            innerRadius="55%"
            outerRadius="85%"
            startAngle={180}
            endAngle={0}
            data={gaugeData}
            barSize={10}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: '#F3F4F6' }}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      
      {/* ROAS Value */}
      <div className="text-center mt-1 mb-3">
        <span className={`text-xl sm:text-3xl font-bold font-mono ${getRoasTextColor(campaign.roas)}`}>
          {campaign.roas.toFixed(2)}
        </span>
        <span className="text-sm text-gray-400 ml-1">ROAS</span>
      </div>
      
      {/* 漏斗指標: CTR → CPC → CVR → 購買數 → 購買價值 → CPA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pt-2 mt-2 border-t border-gray-100 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">CTR</p>
          <p className="text-sm font-semibold text-gray-800">{campaign.ctr.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">CPC</p>
          <p className="text-sm font-semibold text-gray-800">{formatCurrency(campaign.cpc)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">CVR</p>
          <p className="text-sm font-semibold text-gray-800">{campaign.cvr.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">購買數</p>
          <p className="text-sm font-semibold text-gray-800">{campaign.purchases}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">購買價值</p>
          <p className="text-sm font-semibold text-gray-800">NT${campaign.conv_value.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 text-xs">CPA</p>
          <p className="text-sm font-semibold text-gray-800">{formatCurrency(campaign.cpa)}</p>
        </div>
      </div>
    </div>
  );
});

const MetaAdsChart = memo(function MetaAdsChart({ ads: propAds }: MetaAdsChartProps) {
  // 防護：空陣列 fallback 到 mockData
  const ads = (propAds && propAds.length > 0) 
    ? propAds 
    : mockReportData.meta.campaigns.map(c => ({
        name: c.name,
        ad_id: c.campaign_id,
        spend: c.spend,
        ctr: c.ctr,
        roas: c.roas,
        purchases: c.purchases,
        cpa: c.cpa,
        cpc: c.spend / (c.purchases > 0 ? c.purchases : 1),
        cvr: 0,
        clicks: 0,
        conv_value: c.spend * c.roas,  // mock 用 spend*roas 估算
      }));
  
  // 從 ads 計算 total
  const total = useMemo(() => {
    const totalSpend = ads.reduce((sum, a) => sum + a.spend, 0);
    const totalPurchases = ads.reduce((sum, a) => sum + a.purchases, 0);
    const totalConvValue = ads.reduce((sum, a) => sum + a.spend * a.roas, 0);
    return {
      spend: totalSpend,
      roas: totalSpend > 0 ? totalConvValue / totalSpend : 0,
      purchases: totalPurchases,
    };
  }, [ads]);

  // 準備散點圖數據
  const scatterData = useMemo(() => {
    return ads.map(c => ({
      name: c.name,
      spend: c.spend,
      roas: c.roas,
      purchases: c.purchases,
      cpa: c.cpa,
      ctr: c.ctr,
      cpc: c.cpc,
      cvr: c.cvr,
      clicks: c.clicks,
      conv_value: c.conv_value,
      z: c.purchases * 100, // 氣泡大小用 purchases
    }));
  }, [ads]);

  // 計算 X 軸範圍（防護空陣列導致 -Infinity）
  const maxSpend = ads.length > 0 
    ? Math.max(...ads.map(c => c.spend)) 
    : 10000;
  const maxRoas = ads.length > 0 
    ? Math.max(...ads.map(c => c.roas), 2) 
    : 2;

  return (
    <section 
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="meta-ads-title"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 id="meta-ads-title" className="text-base sm:text-lg font-semibold text-gray-900">
            📊 Meta 廣告成效
          </h2>
          <p className="text-xs text-gray-500 hidden sm:block">
            總花費: {formatCurrency(total.spend)} | 總 ROAS: <span className={getRoasTextColor(total.roas)}>{total.roas.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Mobile Summary */}
      <div className="sm:hidden mb-4 flex gap-3 text-xs">
        <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
          <span className="text-gray-500 block">總花費</span>
          <span className="font-mono font-medium">{formatCurrency(total.spend)}</span>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
          <span className="text-gray-500 block">總 ROAS</span>
          <span className={`font-mono font-bold ${getRoasTextColor(total.roas)}`}>{total.roas.toFixed(2)}</span>
        </div>
      </div>

      {/* 氣泡散點圖 */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            花費 vs ROAS 氣泡圖
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-gray-500 hidden sm:inline">&gt;1.5</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-gray-500 hidden sm:inline">1-1.5</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-gray-500 hidden sm:inline">&lt;1</span>
            </span>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 224, contain: 'layout' }}>
          <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 60, bottom: 20, left: 0 }}>
                <XAxis 
                  type="number" 
                  dataKey="spend" 
                  name="花費"
                  domain={[0, maxSpend * 1.1]}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  stroke="#9CA3AF"
                />
                <YAxis 
                  type="number" 
                  dataKey="roas" 
                  name="ROAS"
                  domain={[0, Math.ceil(maxRoas * 1.2)]}
                  tick={{ fontSize: 10 }}
                  stroke="#9CA3AF"
                  width={30}
                />
                <ZAxis 
                  type="number" 
                  dataKey="z" 
                  range={[100, 800]} 
                  name="轉換數"
                />
                
                {/* ROAS = 1 參考線（損益平衡） */}
                <ReferenceLine 
                  y={1} 
                  stroke="#EF4444" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{ 
                    value: '損益平衡', 
                    position: 'insideTopRight', 
                    fill: '#EF4444',
                    fontSize: 10,
                    fontWeight: 500,
                    offset: 5
                  }}
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={tooltipWrapperStyle}
                  contentStyle={tooltipContentStyle}
                />
                
                <Scatter data={scatterData} isAnimationActive={false}>
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getRoasColor(entry.roas)}
                      fillOpacity={0.7}
                      stroke={getRoasColor(entry.roas)}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Gauge 卡片網格 */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          廣告 ROAS 儀表板
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {ads.map((ad, index) => (
            <GaugeCard key={ad.ad_id || index} campaign={ad} />
          ))}
        </div>
      </div>
    </section>
  );
});

export default MetaAdsChart;
