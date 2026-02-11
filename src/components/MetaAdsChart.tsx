'use client';

import { memo, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Target } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

// 漸層色系
const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
];

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

interface CampaignPayload {
  name: string;
  fullName: string;
  spend: number;
  roas: number;
  cpa: number;
  purchases: number;
  ctr: number;
}

// 深色主題 Tooltip
const CampaignTooltip = memo(function CampaignTooltip({ 
  active, 
  payload 
}: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as CampaignPayload;
  
  return (
    <div 
      className="glass-card rounded-xl p-4 border border-white/10 max-w-xs"
      role="tooltip"
    >
      <p className="font-semibold text-white mb-3 text-sm break-words">
        {data.fullName}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">花費</p>
          <p className="font-semibold text-white">{formatCurrency(data.spend)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">ROAS</p>
          <p className="font-semibold text-emerald-400">{data.roas.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">CPA</p>
          <p className="font-semibold text-white">{formatCurrency(data.cpa)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">購買</p>
          <p className="font-semibold text-blue-400">{data.purchases}</p>
        </div>
      </div>
    </div>
  );
});

const MetaAdsChart = memo(function MetaAdsChart({ campaigns: propCampaigns, total }: MetaAdsChartProps) {
  const campaigns = propCampaigns || mockReportData.meta.campaigns;
  
  const data = useMemo(() => campaigns.map((campaign) => ({
    name: campaign.name.length > 20 ? campaign.name.slice(0, 20) + '...' : campaign.name,
    fullName: campaign.name,
    spend: campaign.spend,
    roas: campaign.roas,
    cpa: campaign.cpa,
    purchases: campaign.purchases,
    ctr: campaign.ctr
  })), [campaigns]);

  return (
    <section 
      className="glass-card rounded-2xl p-6"
      aria-labelledby="meta-ads-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="meta-ads-title" className="text-lg font-semibold text-white">
              Meta 廣告成效
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">廣告活動花費分佈</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" aria-hidden="true" />
          <span className="text-slate-400">花費</span>
        </div>
      </div>

      <div aria-label="Meta 廣告活動花費分佈圖">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <defs>
              {CHART_COLORS.map((color, index) => (
                <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={color} stopOpacity={1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.05)" 
              horizontal={true} 
              vertical={false} 
            />
            <XAxis 
              type="number"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={160}
            />
            <Tooltip content={<CampaignTooltip />} />
            <Bar 
              dataKey="spend" 
              radius={[0, 8, 8, 0]}
              maxBarSize={40}
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#barGradient${index % CHART_COLORS.length})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {campaigns.map((campaign, index) => (
          <article 
            key={campaign.campaign_id || index} 
            className="glass-inner p-4 rounded-xl group hover:bg-white/5 transition-all duration-300"
          >
            <p className="text-xs text-slate-500 truncate mb-3 font-medium group-hover:text-slate-400 transition-colors">
              {campaign.name}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p 
                  className="text-2xl font-bold font-mono-nums"
                  style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                >
                  {campaign.roas.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">ROAS</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white font-mono-nums">
                  {formatCurrency(campaign.cpa)}
                </p>
                <p className="text-xs text-slate-500 mt-1">CPA</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});

export default MetaAdsChart;
