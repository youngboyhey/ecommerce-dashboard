'use client';

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

export default function MetaAdsChart() {
  const { campaigns } = mockReportData.meta;
  
  const data = campaigns.map((campaign) => ({
    name: campaign.name.length > 20 ? campaign.name.slice(0, 20) + '...' : campaign.name,
    fullName: campaign.name,
    spend: campaign.spend,
    roas: campaign.roas,
    cpa: campaign.cpa,
    purchases: campaign.purchases,
    ctr: campaign.ctr
  }));

  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100 max-w-xs">
          <p className="font-semibold text-gray-900 mb-2 break-words">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">花費: <span className="font-medium text-gray-900">{formatCurrency(data.spend)}</span></p>
            <p className="text-gray-600">ROAS: <span className="font-medium text-green-600">{data.roas.toFixed(2)}</span></p>
            <p className="text-gray-600">CPA: <span className="font-medium text-gray-900">{formatCurrency(data.cpa)}</span></p>
            <p className="text-gray-600">購買數: <span className="font-medium text-blue-600">{data.purchases}</span></p>
            <p className="text-gray-600">CTR: <span className="font-medium text-purple-600">{data.ctr.toFixed(2)}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">📊 Meta 廣告成效</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span className="text-gray-600">廣告花費</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis 
            type="number"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <YAxis 
            type="category"
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            width={150}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Campaign Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {campaigns.map((campaign, index) => (
          <div key={campaign.campaign_id} className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 truncate mb-1">{campaign.name}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold" style={{ color: colors[index % colors.length] }}>
                  {campaign.roas.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">ROAS</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(campaign.cpa)}</p>
                <p className="text-xs text-gray-400">CPA</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
