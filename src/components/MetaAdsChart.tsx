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

interface CampaignData {
  name: string;
  campaign_id?: string;
  spend: number;
  ctr: number;
  clicks: number;
  roas: number;
  purchases: number;
  atc: number;
  ic: number;
  vc: number;
  conv_value: number;
  cpa: number;
  cp_atc: number;
}

interface TotalData {
  name: string;
  spend: number;
  ctr: number;
  clicks: number;
  roas: number;
  purchases: number;
  atc: number;
  ic: number;
  vc: number;
  conv_value: number;
  cpa: number;
  cp_atc: number;
}

interface MetaAdsChartProps {
  campaigns?: CampaignData[];
  total?: TotalData;
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
          <span className="text-gray-500">CPA</span>
          <span className="font-mono font-medium text-gray-900">{formatCurrency(data.cpa)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">CTR</span>
          <span className="font-mono font-medium text-gray-900">{data.ctr.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};

// Gauge 卡片組件
const GaugeCard = memo(function GaugeCard({ campaign }: { campaign: CampaignData }) {
  const roasValue = Math.min(campaign.roas, 3); // 最大顯示 3
  const roasPercent = (roasValue / 3) * 100;
  const color = getRoasColor(campaign.roas);
  
  const gaugeData = [
    { name: 'roas', value: roasPercent, fill: color }
  ];

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Campaign Name */}
      <p className="text-xs font-medium text-gray-600 truncate mb-2" title={campaign.name}>
        {campaign.name}
      </p>
      
      {/* Gauge Chart - 半圓 */}
      <div className="h-12 sm:h-14">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="90%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={gaugeData}
            barSize={8}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={5}
              background={{ fill: '#F3F4F6' }}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      
      {/* ROAS Value - 獨立區塊 */}
      <div className="text-center mt-1">
        <span className={`text-lg sm:text-xl font-bold font-mono ${getRoasTextColor(campaign.roas)}`}>
          {campaign.roas.toFixed(2)}
        </span>
        <span className="text-xs text-gray-400 ml-1">ROAS</span>
      </div>
      
      {/* CPA & CTR */}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
        <div>
          <span className="text-gray-400">CPA</span>
          <p className="font-mono font-medium text-gray-700">{formatCurrency(campaign.cpa)}</p>
        </div>
        <div className="text-right">
          <span className="text-gray-400">CTR</span>
          <p className="font-mono font-medium text-gray-700">{campaign.ctr.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
});

const MetaAdsChart = memo(function MetaAdsChart({ campaigns: propCampaigns, total: propTotal }: MetaAdsChartProps) {
  const campaigns = propCampaigns || mockReportData.meta.campaigns;
  const total = propTotal || mockReportData.meta.total;

  // 準備散點圖數據
  const scatterData = useMemo(() => {
    return campaigns.map(c => ({
      name: c.name,
      spend: c.spend,
      roas: c.roas,
      purchases: c.purchases,
      cpa: c.cpa,
      ctr: c.ctr,
      z: c.purchases * 100, // 氣泡大小用 purchases
    }));
  }, [campaigns]);

  // 計算 X 軸範圍
  const maxSpend = Math.max(...campaigns.map(c => c.spend));
  const maxRoas = Math.max(...campaigns.map(c => c.roas), 2);

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
                
                <Tooltip content={<CustomTooltip />} />
                
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
          Campaign ROAS 儀表板
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
          {campaigns.map((campaign, index) => (
            <GaugeCard key={campaign.campaign_id || index} campaign={campaign} />
          ))}
        </div>
      </div>
    </section>
  );
});

export default MetaAdsChart;
