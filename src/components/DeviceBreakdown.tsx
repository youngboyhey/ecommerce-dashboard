'use client';

import { memo, useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
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
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import { GA4DeviceData } from '@/lib/types';

// Sort configuration type
type SortKey = 'sessions' | 'users' | 'revenue' | 'transactions' | 'conv_rate';
type SortDirection = 'asc' | 'desc';

interface DeviceBreakdownProps {
  data?: GA4DeviceData[];
  className?: string;
  isLive?: boolean;
}

// 預設模擬數據
const defaultData: GA4DeviceData[] = [
  { 
    device: 'mobile', 
    users: 450,
    sessions: 515, 
    session_pct: 72.0,
    transactions: 4,
    conv_rate: 0.78,
    revenue: 12500
  },
  { 
    device: 'desktop', 
    users: 150,
    sessions: 172, 
    session_pct: 24.1,
    transactions: 3,
    conv_rate: 1.74,
    revenue: 18200
  },
  { 
    device: 'tablet', 
    users: 25,
    sessions: 28, 
    session_pct: 3.9,
    transactions: 0,
    conv_rate: 0,
    revenue: 0
  },
];

// 藍紫色調裝置顏色配置
const DEVICE_COLORS: Record<string, string> = {
  mobile: '#6366F1',
  desktop: '#818CF8',
  tablet: '#A78BFA',
};

// 裝置圖標
const getDeviceIcon = (device: GA4DeviceData['device']) => {
  switch (device) {
    case 'desktop':
      return <Monitor className="w-4 h-4" />;
    case 'mobile':
      return <Smartphone className="w-4 h-4" />;
    case 'tablet':
      return <Tablet className="w-4 h-4" />;
  }
};

// 裝置名稱
const getDeviceName = (device: GA4DeviceData['device']) => {
  switch (device) {
    case 'desktop':
      return '桌機';
    case 'mobile':
      return '手機';
    case 'tablet':
      return '平板';
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

// Custom Tooltip for the chart
const DeviceTooltip = memo(function DeviceTooltip({ 
  active, 
  payload 
}: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as GA4DeviceData & { displayName: string };
  
  return (
    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-900 mb-3 text-sm">{data.displayName}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-gray-500">流量</p>
          <p className="font-bold text-gray-900">{formatNumber(data.sessions)}</p>
        </div>
        <div>
          <p className="text-gray-500">佔比</p>
          <p className="font-bold text-indigo-600">{formatPercent(data.session_pct)}</p>
        </div>
        <div>
          <p className="text-gray-500">用戶數</p>
          <p className="font-bold text-purple-600">{formatNumber(data.users)}</p>
        </div>
        <div>
          <p className="text-gray-500">轉換率</p>
          <p className="font-bold text-emerald-600">{data.conv_rate.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
});

const DeviceBreakdown = memo(function DeviceBreakdown({ 
  data,
  className,
  isLive = false
}: DeviceBreakdownProps) {
  // Sort state - default by sessions descending
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'sessions',
    direction: 'desc'
  });

  // Handle sort toggle
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? ' ▼' : ' ▲';
  };

  // 判斷是否使用模擬數據
  const isUsingMockData = !data || data.length === 0 || !isLive;
  const actualData = (data && data.length > 0) ? data : defaultData;

  // Chart data - sorted by sessions for visualization
  const chartData = useMemo(() => {
    return [...actualData]
      .sort((a, b) => b.sessions - a.sessions)
      .map(d => ({
        ...d,
        displayName: getDeviceName(d.device)
      }));
  }, [actualData]);

  // Sorted data for table
  const sortedData = useMemo(() => {
    return [...actualData].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [actualData, sortConfig]);

  // Calculate totals
  const totals = useMemo(() => {
    return actualData.reduce(
      (acc, d) => ({
        users: acc.users + d.users,
        sessions: acc.sessions + d.sessions,
        transactions: acc.transactions + d.transactions,
        revenue: acc.revenue + d.revenue
      }),
      { users: 0, sessions: 0, transactions: 0, revenue: 0 }
    );
  }, [actualData]);

  return (
    <section 
      className={cn(
        "bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6",
        className
      )}
      aria-labelledby="device-breakdown-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 id="device-breakdown-title" className="text-lg font-semibold text-gray-900">
            📱 裝置分布
          </h2>
          {isUsingMockData && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              數據來源：模擬
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-indigo-500" aria-hidden="true" />
          <span className="text-gray-600">流量</span>
        </div>
      </div>

      {/* Bar Chart - Sessions by Device */}
      <div aria-label="裝置分布圖">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} layout="vertical">
            <defs>
              {Object.entries(DEVICE_COLORS).map(([device, color]) => (
                <linearGradient key={device} id={`deviceGradient-${device}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={color} stopOpacity={1}/>
                </linearGradient>
              ))}
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
              width={60}
            />
            <Tooltip content={<DeviceTooltip />} />
            <Bar 
              dataKey="sessions" 
              radius={[0, 6, 6, 0]}
              maxBarSize={36}
            >
              {chartData.map((entry) => (
                <Cell 
                  key={`cell-${entry.device}`} 
                  fill={`url(#deviceGradient-${entry.device})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Device Table */}
      <div className="mt-6 overflow-x-auto">
        <table 
          className="w-full text-xs" 
          role="table" 
          aria-label="裝置分布數據表"
        >
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="text-left py-3 text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                裝置
              </th>
              <th 
                scope="col" 
                className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('users')}
              >
                用戶{getSortIndicator('users')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('sessions')}
              >
                流量{getSortIndicator('sessions')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('revenue')}
              >
                收入{getSortIndicator('revenue')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('transactions')}
              >
                轉換{getSortIndicator('transactions')}
              </th>
              <th 
                scope="col" 
                className="text-right py-3 text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                onClick={() => handleSort('conv_rate')}
              >
                轉換率{getSortIndicator('conv_rate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((device) => (
              <tr 
                key={device.device} 
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: DEVICE_COLORS[device.device] }} 
                      aria-hidden="true"
                    />
                    <span 
                      className="flex items-center gap-1.5"
                      style={{ color: DEVICE_COLORS[device.device] }}
                    >
                      {getDeviceIcon(device.device)}
                    </span>
                    <span className="font-medium text-gray-900">
                      {getDeviceName(device.device)}
                    </span>
                    <span className="text-gray-400 text-[10px]">
                      ({device.session_pct.toFixed(1)}%)
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right font-medium text-gray-700">
                  {formatNumber(device.users)}
                </td>
                <td className="py-3 text-right font-medium text-gray-700">
                  {formatNumber(device.sessions)}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-bold ${device.revenue > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                    NT${formatNumber(device.revenue)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className={`font-bold ${device.transactions > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                    {device.transactions}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    device.conv_rate > 1.5 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : device.conv_rate > 0.5 
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {device.conv_rate.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
              <td className="py-3 text-gray-700">合計</td>
              <td className="py-3 text-right text-gray-900">{formatNumber(totals.users)}</td>
              <td className="py-3 text-right text-gray-900">{formatNumber(totals.sessions)}</td>
              <td className="py-3 text-right text-emerald-700">NT${formatNumber(totals.revenue)}</td>
              <td className="py-3 text-right text-purple-700">{totals.transactions}</td>
              <td className="py-3 text-right text-gray-500">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
});

export default DeviceBreakdown;
