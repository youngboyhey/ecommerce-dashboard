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
import { formatNumber, formatPercent } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

// 流量來源中文名稱對照
const SOURCE_LABELS: Record<string, string> = {
  'google / cpc': 'Google 廣告',
  'google / organic': 'Google 自然搜尋',
  'facebook / paid': 'Facebook 廣告',
  'facebook / cpc': 'Facebook 廣告',
  'fb / paid': 'Facebook 廣告',
  'instagram / paid': 'Instagram 廣告',
  'ig / paid': 'Instagram 廣告',
  'meta / paid': 'Meta 廣告',
  '(direct) / (none)': '直接流量',
  'direct / none': '直接流量',
  'line / referral': 'LINE 推薦',
  'yahoo / organic': 'Yahoo 自然搜尋',
  'bing / organic': 'Bing 自然搜尋',
  'youtube / referral': 'YouTube 推薦',
  'email / newsletter': '電子報',
  'sms / campaign': '簡訊行銷',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

interface ChannelData {
  source: string;
  displayName?: string;
  sessions: number;
  atc: number;
  ic: number;
  purchases: number;
  session_to_atc_rate: number;
  atc_to_purchase_rate: number;
}

const ChannelTooltip = memo(function ChannelTooltip({ 
  active, 
  payload 
}: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as ChannelData;
  
  return (
    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-900 mb-3 text-sm">{data.displayName || data.source}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-gray-500">Sessions</p>
          <p className="font-bold text-gray-900">{formatNumber(data.sessions)}</p>
        </div>
        <div>
          <p className="text-gray-500">加購數</p>
          <p className="font-bold text-purple-600">{data.atc}</p>
        </div>
        <div>
          <p className="text-gray-500">購買數</p>
          <p className="font-bold text-emerald-600">{data.purchases}</p>
        </div>
        <div>
          <p className="text-gray-500">加購率</p>
          <p className="font-bold text-blue-600">{formatPercent(data.session_to_atc_rate)}</p>
        </div>
      </div>
    </div>
  );
});

interface ChannelPerformanceProps {
  data?: ChannelData[];
}

const ChannelPerformance = memo(function ChannelPerformance({ data }: ChannelPerformanceProps) {
  const channels = useMemo(() => {
    const sourceData = data || [];
    return sourceData
      .filter(c => c.sessions > 20)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6)
      .map(c => ({
        ...c,
        displayName: SOURCE_LABELS[c.source.toLowerCase()] || c.source
      }));
  }, [data]);

  return (
    <section 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="channel-performance-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="channel-performance-title" className="text-lg font-semibold text-gray-900">
          📱 流量來源分析
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
          <span className="text-gray-600">Sessions</span>
        </div>
      </div>

      <div aria-label="流量來源分佈圖">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={channels} layout="vertical">
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
            />
            <YAxis 
              type="category"
              dataKey="displayName"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<ChannelTooltip />} />
            <Bar 
              dataKey="sessions" 
              radius={[0, 6, 6, 0]}
              maxBarSize={36}
            >
              {channels.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS.series[index % CHART_COLORS.series.length]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Channel Summary Table */}
      <div className="mt-6 overflow-x-auto">
        <table 
          className="w-full text-xs" 
          role="table" 
          aria-label="流量來源績效數據表"
        >
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="text-left py-3 text-gray-500 font-semibold uppercase tracking-wider">來源</th>
              <th scope="col" className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider">Sessions</th>
              <th scope="col" className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider">ATC</th>
              <th scope="col" className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider">購買</th>
              <th scope="col" className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider">ATC 率</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel, index) => (
              <tr 
                key={channel.source} 
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: CHART_COLORS.series[index] }} 
                      aria-hidden="true"
                    />
                    <span className="font-medium text-gray-900 truncate max-w-[140px]" title={channel.source}>
                      {channel.displayName || channel.source}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right font-medium text-gray-700">{channel.sessions}</td>
                <td className="py-3 text-right text-purple-600 font-medium">{channel.atc}</td>
                <td className="py-3 text-right">
                  <span className={`font-bold ${channel.purchases > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                    {channel.purchases}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    channel.session_to_atc_rate > 10 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : channel.session_to_atc_rate > 5 
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {formatPercent(channel.session_to_atc_rate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export default ChannelPerformance;
