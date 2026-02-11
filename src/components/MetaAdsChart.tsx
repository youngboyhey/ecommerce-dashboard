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
import { CHART_COLORS } from '@/lib/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

// 提取 Tooltip 到外部
interface CampaignPayload {
  name: string;
  fullName: string;
  spend: number;
  roas: number;
  cpa: number;
  purchases: number;
  ctr: number;
}

const CampaignTooltip = memo(function CampaignTooltip({ 
  active, 
  payload 
}: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as CampaignPayload;
  
  return (
    <div 
      className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 max-w-xs"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-3 text-sm break-words">
        {data.fullName}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-gray-500 text-xs">花費</p>
          <p className="font-semibold text-gray-900">{formatCurrency(data.spend)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">ROAS</p>
          <p className="font-semibold text-green-600">{data.roas.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">CPA</p>
          <p className="font-semibold text-gray-900">{formatCurrency(data.cpa)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">購買</p>
          <p className="font-semibold text-blue-600">{data.purchases}</p>
        </div>
      </div>
    </div>
  );
});

const MetaAdsChart = memo(function MetaAdsChart() {
  const { campaigns } = mockReportData.meta;
  
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
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="meta-ads-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="meta-ads-title" className="text-lg font-semibold text-gray-900">
          📊 Meta 廣告成效
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
          <span className="text-gray-600">廣告花費</span>
        </div>
      </div>

      <div aria-label="Meta 廣告活動花費分佈圖">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#E5E7EB" 
              horizontal={true} 
              vertical={false} 
            />
            <XAxis 
              type="number"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={160}
            />
            <Tooltip content={<CampaignTooltip />} />
            <Bar 
              dataKey="spend" 
              radius={[0, 6, 6, 0]}
              maxBarSize={40}
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS.series[index % CHART_COLORS.series.length]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign Summary Cards - 改善視覺層次 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {campaigns.map((campaign, index) => (
          <article 
            key={campaign.campaign_id} 
            className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-100"
          >
            <p className="text-xs text-gray-500 truncate mb-3 font-medium">
              {campaign.name}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p 
                  className="text-2xl font-bold" 
                  style={{ color: CHART_COLORS.series[index % CHART_COLORS.series.length] }}
                >
                  {campaign.roas.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ROAS</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(campaign.cpa)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">CPA</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});

export default MetaAdsChart;
