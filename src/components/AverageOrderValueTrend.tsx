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
import { formatDate, formatCurrency } from '@/lib/utils';
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

type TimeRange = 'daily' | 'weekly';

interface AOVDataPoint {
  date: string;
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

// Mock 數據
const generateMockData = (): AOVDataPoint[] => {
  const data: AOVDataPoint[] = [];
  const today = new Date();
  
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const orders = Math.floor(Math.random() * 20) + 10;
    const aov = Math.floor(Math.random() * 300) + 1100; // 1100-1400
    
    data.push({
      date: date.toISOString().split('T')[0],
      aov,
      orders,
      revenue: orders * aov,
    });
  }
  
  return data;
};

interface AverageOrderValueTrendProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

const AverageOrderValueTrend = memo(function AverageOrderValueTrend({ dateRange }: AverageOrderValueTrendProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [dailyData, setDailyData] = useState<AOVDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const isMobile = useIsMobile();

  // 從 Supabase 獲取 AOV 數據
  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setDailyData(generateMockData());
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data: reports, error } = await supabase
          .from('reports')
          .select('start_date, cyber_aov, cyber_order_count, cyber_revenue')
          .eq('mode', 'daily')
          .order('start_date', { ascending: true })
          .limit(28);

        if (error || !reports || reports.length === 0) {
          throw new Error('No data');
        }

        const aovData: AOVDataPoint[] = reports.map(r => ({
          date: r.start_date,
          aov: r.cyber_aov || 0,
          orders: r.cyber_order_count || 0,
          revenue: r.cyber_revenue || 0,
        }));

        setDailyData(aovData);
        setIsLive(true);
      } catch (err) {
        console.warn('AOV data fetch failed, using mock:', err);
        setDailyData(generateMockData());
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 🔧 修正：計算選擇週期的平均 AOV（用於參考線）
  // 正確公式：總營收 / 總訂單數（加權平均），而非每日 AOV 的簡單平均
  // 範圍：如果有 dateRange，只計算該週的平均；否則計算所有數據的平均
  const averageAOV = useMemo(() => {
    if (dailyData.length === 0) return 0;
    
    // 🔧 修正：如果有日期範圍，只計算該範圍的平均
    const filteredData = dateRange 
      ? dailyData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end)
      : dailyData;
    
    if (filteredData.length === 0) return 0;
    
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = filteredData.reduce((sum, d) => sum + d.orders, 0);
    return totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  }, [dailyData, dateRange]);

  // 🔧 修正：過濾日期範圍 & 週匯總 - 週視圖以選擇的週為中心
  const data = useMemo(() => {
    if (timeRange === 'daily') {
      if (dateRange) {
        return dailyData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
      }
      return dailyData;
    } else {
      // 週匯總 - 以選擇的週期為基準，往前推 4 週
      const weeks: WeeklyAOVDataPoint[] = [];
      
      // 將數據按日期排序
      const sortedData = [...dailyData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      if (sortedData.length === 0) return weeks;
      
      // 🔧 修正：以 dateRange 為基準計算週
      // 如果有 dateRange，使用它作為 W4（最新週），然後往前推 W3, W2, W1
      // 如果沒有 dateRange，使用數據的最新日期為基準
      let baseWeekEnd: Date;
      if (dateRange) {
        baseWeekEnd = new Date(dateRange.end);
      } else {
        baseWeekEnd = new Date(sortedData[sortedData.length - 1].date);
      }
      
      // 計算 4 週的數據（W1 到 W4，W4 是選擇的週）
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(baseWeekEnd);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        
        // 過濾出這一週的數據
        const weekDays = sortedData.filter(d => 
          d.date >= weekStartStr && d.date <= weekEndStr
        );
        
        const totalOrders = weekDays.reduce((sum, d) => sum + d.orders, 0);
        const totalRevenue = weekDays.reduce((sum, d) => sum + d.revenue, 0);
        // 🔧 客單價 = 總營收 / 總訂單數（統一計算公式）
        const avgAOV = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
        
        weeks.push({
          week: `W${4 - i}`,
          aov: avgAOV,
          orders: totalOrders,
          revenue: totalRevenue,
        });
      }
      
      return weeks;
    }
  }, [timeRange, dailyData, dateRange]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => (
    <ChartTooltip {...props} timeRange={timeRange} />
  ), [timeRange]);

  const yAxisMax = useMemo(() => {
    const maxAOV = Math.max(...data.map(d => d.aov || 0));
    return Math.ceil(maxAOV / 100) * 100 + 200;
  }, [data]);

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
        
        {/* 時間範圍切換 */}
        <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-gray-100 border border-gray-200" role="tablist">
          {(['daily', 'weekly'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              role="tab"
              aria-selected={timeRange === range}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                timeRange === range
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {range === 'daily' ? '日' : '週'}
            </button>
          ))}
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
              dataKey={timeRange === 'daily' ? 'date' : 'week'}
              tickFormatter={(value) => timeRange === 'daily' ? formatDate(value) : value}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              dy={isMobile ? 4 : 8}
              interval={isMobile ? 'preserveStartEnd' : 0}
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
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#FCD34D' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export default AverageOrderValueTrend;
