'use client';

import { memo, useMemo, useState } from 'react';
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
import { tooltipWrapperStyle, tooltipContentStyle } from './ChartTooltipWrapper';

// 品牌主色系對照表 (根據中文顯示名稱)
const SOURCE_COLORS: Record<string, string> = {
  // Facebook 系列 - Facebook 藍
  'Facebook 廣告': '#1877F2',
  'Facebook 手機版': '#1877F2',
  'Facebook 連結': '#1877F2',
  'Facebook': '#1877F2',
  
  // Instagram 系列 - Instagram 紫紅
  'Instagram 廣告': '#E4405F',
  'Instagram 連結': '#E4405F',
  
  // Threads - 黑色
  'Threads 廣告': '#000000',
  
  // Meta 廣告 (Audience Network)
  'Meta 廣告': '#0081FB',
  'Audience Network 廣告': '#0081FB',
  
  // Google 系列 - Google 藍/綠
  'Google 廣告': '#4285F4',
  'Google 自然搜尋': '#34A853',
  
  // LINE - LINE 綠
  'LINE': '#06C755',
  'LINE 推薦': '#06C755',
  
  // 直接流量 - 灰色
  '直接流量': '#6B7280',
  
  // YouTube - 紅色
  'YouTube 推薦': '#FF0000',
  
  // Yahoo - 紫色
  'Yahoo 自然搜尋': '#720E9E',
  
  // Bing - 青綠色
  'Bing 自然搜尋': '#00809D',
  
  // ChatGPT - OpenAI 綠
  'ChatGPT': '#10A37F',
  
  // 力魔/GitHub - 橘色
  '力魔官網': '#F59E0B',
  '力魔 GitHub': '#F59E0B',
  
  // BOSCH - 紅色
  'BOSCH 官網': '#E20015',
  'BOSCH 商城': '#E20015',
  
  // 其他
  '電子報': '#EA4335',
  '簡訊行銷': '#34A853',
  '短網址 (reurl)': '#8B5CF6',
  'Cyberbiz 金流': '#F472B6',
  '內部網路': '#94A3B8',
  
  // 未分類/其他 - 淺灰
  '未分類': '#9CA3AF',
  '(not set)': '#9CA3AF',
};

// 根據顯示名稱取得品牌顏色
function getSourceColor(displayName: string): string {
  // 精確匹配
  if (SOURCE_COLORS[displayName]) {
    return SOURCE_COLORS[displayName];
  }
  
  // 模糊匹配 (包含關鍵字)
  const lowerName = displayName.toLowerCase();
  if (lowerName.includes('facebook') || lowerName.includes('fb')) return '#1877F2';
  if (lowerName.includes('instagram') || lowerName.includes('ig')) return '#E4405F';
  if (lowerName.includes('threads')) return '#000000';
  if (lowerName.includes('google')) return '#4285F4';
  if (lowerName.includes('line')) return '#06C755';
  if (lowerName.includes('youtube')) return '#FF0000';
  if (lowerName.includes('yahoo')) return '#720E9E';
  if (lowerName.includes('bing')) return '#00809D';
  if (lowerName.includes('chatgpt') || lowerName.includes('openai')) return '#10A37F';
  if (lowerName.includes('直接') || lowerName.includes('direct')) return '#6B7280';
  
  // 預設淺灰
  return '#9CA3AF';
}

// 備用漸層色系 (已不使用，保留供參考)
const CHART_COLORS = [
  '#6366F1', // indigo
  '#818CF8', // indigo-light
  '#A78BFA', // violet
  '#C4B5FD', // violet-light
  '#67E8F9', // cyan
  '#10B981', // emerald
];

// Sort configuration type
type SortKey = 'sessions' | 'atc' | 'purchases' | 'session_to_atc_rate';
type SortDirection = 'asc' | 'desc';

// 流量來源中文名稱對照
const SOURCE_LABELS: Record<string, string> = {
  'google / cpc': 'Google 廣告',
  'google / organic': 'Google 自然搜尋',
  'facebook / paid': 'Facebook 廣告',
  'facebook / cpc': 'Facebook 廣告',
  'fb / paid': 'Facebook 廣告',
  'instagram / paid': 'Instagram 廣告',
  'ig / paid': 'Instagram 廣告',
  'th / paid': 'Threads 廣告',
  'meta / paid': 'Meta 廣告',
  '(direct) / (none)': '直接流量',
  'direct / none': '直接流量',
  'm.facebook.com / referral': 'Facebook 手機版',
  'l.facebook.com / referral': 'Facebook 連結',
  'lm.facebook.com / referral': 'Facebook 連結',
  'liqui-moly-tw.com / referral': '力魔官網',
  'boschman-giasco.com.tw / referral': 'BOSCH 官網',
  'reurl.cc / referral': '短網址 (reurl)',
  '(not set)': '未分類',
  'line / referral': 'LINE 推薦',
  'yahoo / organic': 'Yahoo 自然搜尋',
  'bing / organic': 'Bing 自然搜尋',
  'youtube / referral': 'YouTube 推薦',
  'email / newsletter': '電子報',
  'sms / campaign': '簡訊行銷',
  // 2025-02 新增
  '192.168.10.23 / referral': '內部網路',
  'access.line.me / referral': 'LINE',
  'an / paid': 'Audience Network 廣告',
  'boschmanec.cyberbiz.co / referral': 'BOSCH 商城',
  'chatgpt.com / (not set)': 'ChatGPT',
  'cyberbizpay.com / referral': 'Cyberbiz 金流',
  'facebook.com / referral': 'Facebook',
  'l.instagram.com / referral': 'Instagram 連結',
  'liquimolytaiwan.github.io / referral': '力魔 GitHub',
};

// 取得來源的中文顯示名稱 (case-insensitive)
function getSourceName(source: string): string {
  const lowerSource = source.toLowerCase();
  // 遍歷所有 key 找匹配
  for (const [key, value] of Object.entries(SOURCE_LABELS)) {
    if (key.toLowerCase() === lowerSource) {
      return value;
    }
  }
  return source;
}

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
      <p className="font-semibold text-gray-900 mb-3 text-sm">{data.displayName || getSourceName(data.source)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-gray-500">工作階段</p>
          <p className="font-bold text-gray-900">{formatNumber(data.sessions)}</p>
        </div>
        <div>
          <p className="text-gray-500">ATC</p>
          <p className="font-bold text-purple-600">{data.atc}</p>
        </div>
        <div>
          <p className="text-gray-500">購買</p>
          <p className="font-bold text-emerald-600">{data.purchases}</p>
        </div>
        <div>
          <p className="text-gray-500">轉換率</p>
          <p className="font-bold text-indigo-600">{formatPercent(data.sessions > 0 ? (data.purchases / data.sessions) * 100 : 0)}</p>
        </div>
      </div>
    </div>
  );
});

interface ChannelPerformanceProps {
  data?: ChannelData[];
}

const ChannelPerformance = memo(function ChannelPerformance({ data }: ChannelPerformanceProps) {
  // Sort state - default by sessions descending
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'sessions',
    direction: 'desc'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Get sort indicator
  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? ' ▼' : ' ▲';
  };

  // Process channels - keep all sources with sessions > 0 (removed strict filter)
  const channels = useMemo(() => {
    const sourceData = data || [];
    return sourceData
      .filter(c => c.sessions > 0)  // Keep any source with traffic
      .map(c => ({
        ...c,
        displayName: getSourceName(c.source)
      }));
  }, [data]);

  // Chart data - top 6 by sessions for visualization
  const chartData = useMemo(() => {
    return [...channels]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6);
  }, [channels]);

  // Sorted table data - all channels sorted by user selection
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      
      if (sortConfig.key === 'session_to_atc_rate') {
        // 轉換率 = purchases / sessions
        aVal = a.sessions > 0 ? (a.purchases / a.sessions) * 100 : 0;
        bVal = b.sessions > 0 ? (b.purchases / b.sessions) * 100 : 0;
      } else {
        aVal = a[sortConfig.key] ?? 0;
        bVal = b[sortConfig.key] ?? 0;
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [channels, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedChannels.length / ITEMS_PER_PAGE);
  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedChannels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedChannels, currentPage]);

  // Reset to page 1 when sort changes
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  // Calculate totals for summary row
  const totals = useMemo(() => {
    return channels.reduce(
      (acc, c) => ({
        sessions: acc.sessions + c.sessions,
        atc: acc.atc + c.atc,
        purchases: acc.purchases + c.purchases
      }),
      { sessions: 0, atc: 0, purchases: 0 }
    );
  }, [channels]);

  return (
    <section 
      className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6"
      aria-labelledby="channel-performance-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="channel-performance-title" className="text-lg font-semibold text-gray-900">
          📱 流量來源分析
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-indigo-500" aria-hidden="true" />
          <span className="text-gray-600">工作階段</span>
        </div>
      </div>

      <div aria-label="流量來源分佈圖">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical">
            <defs>
              {chartData.map((item, index) => {
                const color = getSourceColor(item.displayName);
                return (
                  <linearGradient key={index} id={`channelGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.7}/>
                    <stop offset="100%" stopColor={color} stopOpacity={1}/>
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#F3F4F6" 
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
              tick={{ fill: '#374151', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip 
              content={<ChannelTooltip />}
              wrapperStyle={tooltipWrapperStyle}
              contentStyle={tooltipContentStyle}
            />
            <Bar 
              dataKey="sessions" 
              radius={[0, 6, 6, 0]}
              maxBarSize={36}
            >
              {chartData.map((item, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#channelGradient${index})`}
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
              <th scope="col" className="text-left py-3 pr-4 text-gray-500 font-semibold tracking-wider">
                來源
              </th>
              <th 
                scope="col" 
                className="text-right py-3 px-3 text-gray-500 font-semibold tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('sessions')}
              >
                工作階段{getSortIndicator('sessions')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 px-3 text-gray-500 font-semibold tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('atc')}
              >
                ATC{getSortIndicator('atc')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 px-3 text-gray-500 font-semibold tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('purchases')}
              >
                購買{getSortIndicator('purchases')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 pl-3 text-gray-500 font-semibold tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('session_to_atc_rate')}
              >
                轉換率{getSortIndicator('session_to_atc_rate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((channel, index) => (
              <tr 
                key={channel.source} 
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getSourceColor(channel.displayName) }} 
                      aria-hidden="true"
                    />
                    <span className="font-medium text-gray-900 truncate max-w-[140px]" title={channel.source}>
                      {channel.displayName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium text-gray-700">{formatNumber(channel.sessions)}</td>
                <td className="py-3 px-3 text-right text-purple-600 font-medium">{channel.atc}</td>
                <td className="py-3 px-3 text-right">
                  <span className={`font-bold ${channel.purchases > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                    {channel.purchases}
                  </span>
                </td>
                <td className="py-3 pl-3 text-right">
                  {(() => {
                    const conversionRate = channel.sessions > 0 ? (channel.purchases / channel.sessions) * 100 : 0;
                    return (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        conversionRate > 10 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : conversionRate > 5 
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {formatPercent(conversionRate)}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
              <td className="py-3 pr-4 text-gray-700">合計</td>
              <td className="py-3 px-3 text-right text-gray-900">{formatNumber(totals.sessions)}</td>
              <td className="py-3 px-3 text-right text-purple-700">{totals.atc}</td>
              <td className="py-3 px-3 text-right text-emerald-700">{totals.purchases}</td>
              <td className="py-3 pl-3 text-right text-gray-500">—</td>
            </tr>
          </tfoot>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-500 text-white hover:bg-indigo-600 disabled:hover:bg-indigo-500"
            >
              上一頁
            </button>
            <span className="text-xs text-gray-500 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-500 text-white hover:bg-indigo-600 disabled:hover:bg-indigo-500"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

export default ChannelPerformance;
