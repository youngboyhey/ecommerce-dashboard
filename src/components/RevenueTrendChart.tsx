'use client';

import { useState, memo, useMemo, useCallback, useEffect } from 'react';
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

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  
  return isMobile;
}
import { useHistoricalData } from '@/lib/useHistoricalData';
import { mockHistoricalData, mockWeeklyData } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { TrendingUp } from 'lucide-react';
import { tooltipWrapperStyle, tooltipContentStyle } from './ChartTooltipWrapper';

type TimeRange = 'daily' | 'weekly';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

interface RevenueTrendChartProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  timeRange: TimeRange;
}

// 白色主題 Tooltip
const ChartTooltip = memo(function ChartTooltip({ 
  active, 
  payload, 
  label,
  timeRange 
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div 
      className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-3 text-sm">
        {timeRange === 'daily' ? formatDate(String(label)) : label}
      </p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
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

const RevenueTrendChart = memo(function RevenueTrendChart({ dateRange }: RevenueTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const { dailyData, weeklyData, isLoading, error } = useHistoricalData();
  const [hasDailyData, setHasDailyData] = useState(false);
  const isMobile = useIsMobile();

  // 檢查是否有真正的日粒度數據
  useEffect(() => {
    async function checkDailyData() {
      if (!supabase) { setHasDailyData(false); return; }
      try {
        const { data, error: err } = await supabase
          .from('reports')
          .select('id')
          .eq('mode', 'daily')
          .limit(1);
        const hasDaily = !err && !!data && data.length > 0;
        setHasDailyData(hasDaily);
        if (hasDaily) setTimeRange('daily');
      } catch {
        setHasDailyData(false);
      }
    }
    checkDailyData();
  }, []);

  const data = useMemo(() => {
    if (timeRange === 'daily') {
      const sourceData = dailyData.length > 0 ? dailyData : mockHistoricalData;
      if (dateRange) {
        return sourceData.filter((d) => {
          return d.date >= dateRange.start && d.date <= dateRange.end;
        });
      }
      return sourceData;
    } else {
      return weeklyData.length > 0 ? weeklyData : mockWeeklyData;
    }
  }, [timeRange, dailyData, weeklyData, dateRange]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => (
    <ChartTooltip {...props} timeRange={timeRange} />
  ), [timeRange]);

  const { yAxisMax, roasMax } = useMemo(() => {
    const maxRevenue = Math.max(...data.map(d => d.revenue || 0));
    const maxSpend = Math.max(...data.map(d => d.spend || 0));
    const maxRoas = Math.max(...data.map(d => d.roas || 0));
    
    return {
      yAxisMax: Math.ceil(Math.max(maxRevenue, maxSpend) / 1000) * 1000 + 1000,
      roasMax: Math.ceil(maxRoas * 2) / 2 + 0.5,
    };
  }, [data]);

  return (
    <section 
      className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="revenue-trend-title"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 id="revenue-trend-title" className="text-base sm:text-lg font-semibold text-gray-900">
              營收趨勢
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isLoading && (
                <span className="text-xs text-gray-400 animate-pulse">載入中...</span>
              )}
              {!isLoading && dailyData.length > 0 && (
                <span className="badge badge-success text-[10px] sm:text-xs">● 即時數據</span>
              )}
              {!isLoading && error && (
                <span className="badge badge-warning text-[10px] sm:text-xs">⚠️ 備用數據</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 時間範圍切換：無日粒度數據時只顯示「週」標籤 */}
        {hasDailyData ? (
          <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-gray-100 border border-gray-200" role="tablist">
            {(['daily', 'weekly'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                role="tab"
                aria-selected={timeRange === range}
                aria-controls="revenue-chart"
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {range === 'daily' ? '日' : '週'}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-gray-100 border border-gray-200">
            <span className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
              週
            </span>
          </div>
        )}
      </div>

      <div id="revenue-chart" role="tabpanel" aria-label="營收趨勢圖表" className="min-h-[250px] sm:min-h-[420px]">
        <ResponsiveContainer width="100%" height={isMobile ? 280 : 420}>
          <ComposedChart 
            data={data}
            margin={isMobile ? { top: 5, right: 5, left: 0, bottom: 5 } : { top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#F3F4F6" 
              vertical={false}
            />
            <XAxis 
              dataKey={timeRange === 'daily' ? 'date' : 'week'}
              tickFormatter={(value) => timeRange === 'daily' ? formatDate(value) : value}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              dy={isMobile ? 4 : 8}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              yAxisId="left"
              width={isMobile ? 35 : 50}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              domain={[0, yAxisMax]}
              dx={isMobile ? -4 : -8}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              width={isMobile ? 25 : 40}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, roasMax]}
              dx={isMobile ? 4 : 8}
              hide={isMobile}
            />
            <Tooltip 
              content={renderTooltip}
              wrapperStyle={tooltipWrapperStyle}
              contentStyle={tooltipContentStyle}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="營收"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="廣告花費"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="roas"
              name="MER"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#A5B4FC' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export default RevenueTrendChart;
