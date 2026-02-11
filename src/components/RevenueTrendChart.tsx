'use client';

import { useState, memo, useMemo, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { useHistoricalData } from '@/lib/useHistoricalData';
import { mockHistoricalData, mockWeeklyData } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

type TimeRange = 'daily' | 'weekly';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

// 提取 Tooltip 組件到外部，避免每次渲染重新創建
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  timeRange: TimeRange;
}

const ChartTooltip = memo(function ChartTooltip({ 
  active, 
  payload, 
  label,
  timeRange 
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div 
      className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-2 text-sm">
        {timeRange === 'daily' ? formatDate(String(label)) : label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name === '營收' || entry.name === '廣告花費'
                ? formatCurrency(entry.value as number)
                : entry.name === 'MER'
                  ? (entry.value as number).toFixed(2)
                  : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const RevenueTrendChart = memo(function RevenueTrendChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  
  // 從 Supabase 讀取真實數據
  const { dailyData, weeklyData, isLoading, error } = useHistoricalData();

  // 如果沒有真實數據，fallback 到 mock 數據
  const data = useMemo(() => {
    if (timeRange === 'daily') {
      return dailyData.length > 0 ? dailyData : mockHistoricalData;
    } else {
      return weeklyData.length > 0 ? weeklyData : mockWeeklyData;
    }
  }, [timeRange, dailyData, weeklyData]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // 自定義 Tooltip 渲染器
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => (
    <ChartTooltip {...props} timeRange={timeRange} />
  ), [timeRange]);

  // 計算 Y 軸最大值和 ROAS 範圍
  const { yAxisMax, roasMax } = useMemo(() => {
    const maxRevenue = Math.max(...data.map(d => d.revenue || 0));
    const maxSpend = Math.max(...data.map(d => d.spend || 0));
    const maxRoas = Math.max(...data.map(d => d.roas || 0));
    
    return {
      yAxisMax: Math.ceil(Math.max(maxRevenue, maxSpend) / 1000) * 1000 + 1000,
      roasMax: Math.ceil(maxRoas * 2) / 2 + 0.5, // 給 ROAS 一點空間
    };
  }, [data]);

  return (
    <section 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="revenue-trend-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 id="revenue-trend-title" className="text-lg font-semibold text-gray-900">
            📈 營收趨勢
          </h2>
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">載入中...</span>
          )}
          {!isLoading && dailyData.length > 0 && (
            <span className="text-xs text-green-500 font-medium">● 即時數據</span>
          )}
          {!isLoading && error && (
            <span className="text-xs text-amber-500">⚠️ 使用備用數據</span>
          )}
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg" role="tablist">
          {(['daily', 'weekly'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              role="tab"
              aria-selected={timeRange === range}
              aria-controls="revenue-chart"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'daily' ? '日' : '週'}
            </button>
          ))}
        </div>
      </div>

      <div 
        id="revenue-chart"
        role="tabpanel"
        aria-label="營收趨勢圖表"
      >
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#E5E7EB" 
              vertical={false}
            />
            <XAxis 
              dataKey={timeRange === 'daily' ? 'date' : 'week'}
              tickFormatter={(value) => timeRange === 'daily' ? formatDate(value) : value}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              dy={8}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              domain={[0, yAxisMax]}
              dx={-8}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, roasMax]}
              dx={8}
            />
            <Tooltip content={renderTooltip} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="營收"
              stroke={CHART_COLORS.revenue}
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="廣告花費"
              stroke={CHART_COLORS.spend}
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="roas"
              name="MER"
              stroke={CHART_COLORS.roas}
              strokeWidth={2.5}
              dot={{ fill: CHART_COLORS.roas, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export default RevenueTrendChart;
