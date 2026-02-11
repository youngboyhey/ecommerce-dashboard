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
import { formatNumber, formatPercent } from '@/lib/utils';

export default function ChannelPerformance() {
  const channels = mockReportData.ga4_channels
    .filter(c => c.sessions > 20)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900 mb-2">{data.source}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">Sessions: <span className="font-medium text-gray-900">{formatNumber(data.sessions)}</span></p>
            <p className="text-gray-600">加購數: <span className="font-medium text-purple-600">{data.atc}</span></p>
            <p className="text-gray-600">購買數: <span className="font-medium text-green-600">{data.purchases}</span></p>
            <p className="text-gray-600">加購率: <span className="font-medium text-blue-600">{formatPercent(data.session_to_atc_rate)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">📱 流量來源分析</h2>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={channels} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis 
            type="number"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            type="category"
            dataKey="source"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#E5E7EB' }}
            width={140}
            tickFormatter={(value) => value.length > 18 ? value.slice(0, 18) + '...' : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
            {channels.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Channel Summary Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-500 font-medium">來源</th>
              <th className="text-right py-2 text-gray-500 font-medium">Sessions</th>
              <th className="text-right py-2 text-gray-500 font-medium">ATC</th>
              <th className="text-right py-2 text-gray-500 font-medium">購買</th>
              <th className="text-right py-2 text-gray-500 font-medium">ATC 率</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel, index) => (
              <tr key={channel.source} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index] }} />
                    <span className="font-medium text-gray-900 truncate max-w-[120px]">{channel.source}</span>
                  </div>
                </td>
                <td className="py-2 text-right text-gray-600">{channel.sessions}</td>
                <td className="py-2 text-right text-purple-600">{channel.atc}</td>
                <td className="py-2 text-right text-green-600 font-medium">{channel.purchases}</td>
                <td className="py-2 text-right text-blue-600">{formatPercent(channel.session_to_atc_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
