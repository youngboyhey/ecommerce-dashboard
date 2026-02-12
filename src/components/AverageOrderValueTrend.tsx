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
  ReferenceLine
} from 'recharts';
import { ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { tooltipWrapperStyle, tooltipContentStyle } from './ChartTooltipWrapper';

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

// 🔧 恢復日/週切換功能
type TimeRange = 'daily' | 'weekly';

interface AOVDataPoint {
  date: string;
  label: string;
  aov: number;
  orders: number;
  revenue: number;
}

interface WeeklyAOVDataPoint {
  week: string;
  aov: number;
  orders: number;
  revenue: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  timeRange?: TimeRange;
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
        {timeRange === 'daily' ? label : label}
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
              {entry.name === '客單價' 
                ? formatCurrency(entry.value as number)
                : entry.value?.toLocaleString()
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

interface AverageOrderValueTrendProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

const AverageOrderValueTrend = memo(function AverageOrderValueTrend({ dateRange }: AverageOrderValueTrendProps) {
  // 🔧 恢復日/週切換功能
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [dailyData, setDailyData] = useState<AOVDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyAOVDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [hasDailyData, setHasDailyData] = useState(false);
  const isMobile = useIsMobile();

  // 獲取數據
  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        // 無 Supabase 時使用 mock 數據
        setWeeklyData([
          { week: 'W1', aov: 1250, orders: 45, revenue: 56250 },
          { week: 'W2', aov: 1180, orders: 52, revenue: 61360 },
          { week: 'W3', aov: 1320, orders: 48, revenue: 63360 },
          { week: 'W4', aov: 1150, orders: 55, revenue: 63250 },
        ]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // 1. 嘗試獲取 daily 數據
        const { data: dailyReports, error: dailyError } = await supabase
          .from('reports')
          .select('start_date, cyber_aov, cyber_order_count, cyber_revenue')
          .eq('mode', 'daily')
          .order('start_date', { ascending: true })
          .limit(28);

        if (!dailyError && dailyReports && dailyReports.length > 0) {
          // 有 daily 數據
          const dailyAovData: AOVDataPoint[] = dailyReports.map((report) => ({
            date: report.start_date,
            label: formatDate(report.start_date),
            aov: report.cyber_aov || 0,
            orders: report.cyber_order_count || 0,
            revenue: report.cyber_revenue || 0,
          }));
          
          setDailyData(dailyAovData);
          setHasDailyData(true);
          console.log(`✅ Loaded ${dailyReports.length} daily AOV records`);
        } else {
          setHasDailyData(false);
          // 如果沒有 daily 數據，默認切換到 weekly
          setTimeRange('weekly');
        }
        
        // 2. 獲取 weekly 數據（作為 fallback 或切換用）
        const { data: weeklyReports, error: weeklyError } = await supabase
          .from('reports')
          .select('start_date, end_date, cyber_aov, cyber_order_count, cyber_revenue')
          .eq('mode', 'weekly')
          .order('start_date', { ascending: true })
          .limit(4);

        if (!weeklyError && weeklyReports && weeklyReports.length > 0) {
          const weeklyAovData: WeeklyAOVDataPoint[] = weeklyReports.map((report, index) => ({
            week: `W${index + 1}`,
            aov: report.cyber_aov || 0,
            orders: report.cyber_order_count || 0,
            revenue: report.cyber_revenue || 0,
          }));

          setWeeklyData(weeklyAovData);
          console.log(`✅ Loaded ${weeklyReports.length} weekly AOV records`);
        }

        setIsLive(true);
      } catch (err) {
        console.warn('AOV data fetch failed, using mock:', err);
        setWeeklyData([
          { week: 'W1', aov: 1250, orders: 45, revenue: 56250 },
          { week: 'W2', aov: 1180, orders: 52, revenue: 61360 },
          { week: 'W3', aov: 1320, orders: 48, revenue: 63360 },
          { week: 'W4', aov: 1150, orders: 55, revenue: 63250 },
        ]);
        setIsLive(false);
        setHasDailyData(false);
        setTimeRange('weekly');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 計算平均 AOV（用於參考線）
  // 正確公式：總營收 / 總訂單數（加權平均）
  const averageAOV = useMemo(() => {
    const dataToUse = timeRange === 'daily' ? dailyData : weeklyData;
    if (dataToUse.length === 0) return 0;
    
    const totalRevenue = dataToUse.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dataToUse.reduce((sum, d) => sum + d.orders, 0);
    return totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  }, [timeRange, dailyData, weeklyData]);

  // 根據 timeRange 選擇數據
  const data = useMemo(() => {
    if (timeRange === 'daily') {
      return dailyData.map(d => ({
        ...d,
        displayKey: d.label
      }));
    } else {
      return weeklyData.map(d => ({
        ...d,
        displayKey: d.week
      }));
    }
  }, [timeRange, dailyData, weeklyData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => (
    <ChartTooltip {...props} timeRange={timeRange} />
  ), [timeRange]);

  const yAxisMax = useMemo(() => {
    const maxAOV = Math.max(...data.map(d => d.aov || 0));
    return Math.ceil(maxAOV / 100) * 100 + 200;
  }, [data]);

  // X 軸的 dataKey
  const xDataKey = timeRange === 'daily' ? 'label' : 'week';

  return (
    <section 
      className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="aov-trend-title"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 id="aov-trend-title" className="text-base sm:text-lg font-semibold text-gray-900">
              客單價趨勢
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isLoading && (
                <span className="text-xs text-gray-400 animate-pulse">載入中...</span>
              )}
              {!isLoading && isLive && (
                <span className="badge badge-success text-[10px] sm:text-xs">● 即時數據</span>
              )}
              {!isLoading && !isLive && (
                <span className="badge badge-warning text-[10px] sm:text-xs">⚠️ 備用數據</span>
              )}
              {!isLoading && averageAOV > 0 && (
                <span className="text-xs text-gray-500">
                  平均 {formatCurrency(averageAOV)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* 🔧 恢復日/週切換按鈕 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTimeRange('daily')}
            disabled={!hasDailyData}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all
              ${timeRange === 'daily'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                : hasDailyData
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            title={hasDailyData ? '顯示每日數據' : '無每日數據'}
          >
            日
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all
              ${timeRange === 'weekly'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            週
          </button>
        </div>
      </div>

      <div className="min-h-[250px] sm:min-h-[320px]">
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
          <ComposedChart 
            data={data}
            margin={isMobile ? { top: 5, right: 5, left: 0, bottom: 5 } : { top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorAOV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#F3F4F6" 
              vertical={false}
            />
            <XAxis 
              dataKey={xDataKey}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              dy={isMobile ? 4 : 8}
              interval={timeRange === 'daily' ? (isMobile ? 4 : 2) : 0}
              angle={timeRange === 'daily' ? -45 : 0}
              textAnchor={timeRange === 'daily' ? 'end' : 'middle'}
            />
            <YAxis 
              width={isMobile ? 40 : 55}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
              domain={[0, yAxisMax]}
              dx={isMobile ? -4 : -8}
            />
            {/* 平均線 */}
            <ReferenceLine 
              y={averageAOV} 
              stroke="#9CA3AF" 
              strokeDasharray="5 5"
              label={{ 
                value: `平均 $${(averageAOV / 1000).toFixed(1)}K`, 
                position: 'right',
                fill: '#6B7280',
                fontSize: 11,
              }}
            />
            <Tooltip 
              content={renderTooltip}
              wrapperStyle={tooltipWrapperStyle}
              contentStyle={tooltipContentStyle}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="aov"
              name="客單價"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#colorAOV)"
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: timeRange === 'daily' ? 2 : 3 }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#FCD34D' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export default AverageOrderValueTrend;
