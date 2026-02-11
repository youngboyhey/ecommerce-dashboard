'use client';

import { memo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Target } from 'lucide-react';

// 彩色圓點色系
const DOT_COLORS = [
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
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

// ROAS 顏色判斷
const getRoasColor = (roas: number): string => {
  if (roas < 1) return 'text-red-600';
  if (roas >= 1.5) return 'text-emerald-600';
  return 'text-gray-900';
};

const MetaAdsChart = memo(function MetaAdsChart({ campaigns: propCampaigns, total: propTotal }: MetaAdsChartProps) {
  const campaigns = propCampaigns || mockReportData.meta.campaigns;
  const total = propTotal || mockReportData.meta.total;

  return (
    <section 
      className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="meta-ads-title"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Target className="w-5 h-5 text-white" />
        </div>
        <h2 id="meta-ads-title" className="text-lg font-semibold text-gray-900">
          📊 Meta 廣告成效
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-600">Campaign</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600">花費</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600">ROAS</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600">CPA</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600">轉換</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600">CTR</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => (
              <tr 
                key={campaign.campaign_id || index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DOT_COLORS[index % DOT_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="text-gray-900 truncate max-w-[180px]" title={campaign.name}>
                      {campaign.name}
                    </span>
                  </div>
                </td>
                <td className="text-right py-3 px-2 font-mono text-gray-900">
                  {formatCurrency(campaign.spend)}
                </td>
                <td className={`text-right py-3 px-2 font-mono font-semibold ${getRoasColor(campaign.roas)}`}>
                  {campaign.roas.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2 font-mono text-gray-900">
                  {formatCurrency(campaign.cpa)}
                </td>
                <td className="text-right py-3 px-2 font-mono text-gray-900">
                  {campaign.purchases}
                </td>
                <td className="text-right py-3 px-2 font-mono text-gray-900">
                  {campaign.ctr.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="py-3 px-2 text-gray-900">合計</td>
              <td className="text-right py-3 px-2 font-mono text-gray-900">
                {formatCurrency(total.spend)}
              </td>
              <td className={`text-right py-3 px-2 font-mono font-semibold ${getRoasColor(total.roas)}`}>
                {total.roas.toFixed(2)}
              </td>
              <td className="text-right py-3 px-2 font-mono text-gray-900">
                {formatCurrency(total.cpa)}
              </td>
              <td className="text-right py-3 px-2 font-mono text-gray-900">
                {total.purchases}
              </td>
              <td className="text-right py-3 px-2 font-mono text-gray-900">
                {total.ctr.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
});

export default MetaAdsChart;
