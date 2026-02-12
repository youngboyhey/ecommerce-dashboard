'use client';

import { useState, memo, useMemo, useCallback, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
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

interface MemberDataPoint {
  date: string;
  newMembers: number;
}

interface WeeklyMemberDataPoint {
  week: string;
  newMembers: number;
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
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Mock 數據（當 Supabase 無法取得時使用）
const generateMockData = (): MemberDataPoint[] => {
  const data: MemberDataPoint[] = [];
  const today = new Date();
  
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const newMembers = Math.floor(Math.random() * 30) + 15; // 15-45 新會員
    
    data.push({
      date: date.toISOString().split('T')[0],
      newMembers,
    });
  }
  
  return data;
};

interface MemberGrowthTrendProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

const MemberGrowthTrend = memo(function MemberGrowthTrend({ dateRange }: MemberGrowthTrendProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [dailyData, setDailyData] = useState<MemberDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const isMobile = useIsMobile();

  // 從 Supabase 獲取會員數據
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
          .select('start_date, cyber_new_members')
          .eq('mode', 'daily')
          .order('start_date', { ascending: true })
          .limit(28);

        if (error || !reports || reports.length === 0) {
          throw new Error('No data');
        }

        const memberData: MemberDataPoint[] = reports.map(r => ({
          date: r.start_date,
          newMembers: r.cyber_new_members || 0,
        }));

        setDailyData(memberData);
        setIsLive(true);
      } catch (err) {
        console.warn('Member data fetch failed, using mock:', err);
        setDailyData(generateMockData());
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 過濾日期範圍 & 週匯總
  const data = useMemo(() => {
    if (timeRange === 'daily') {
      if (dateRange) {
        return dailyData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
      }
      return dailyData;
    } else {
      // 週匯總
      const weeks: WeeklyMemberDataPoint[] = [];
      let weekNum = 1;
      
      for (let i = 0; i < dailyData.length; i += 7) {
        const weekDays = dailyData.slice(i, Math.min(i + 7, dailyData.length));
        const totalNewMembers = weekDays.reduce((sum, d) => sum + d.newMembers, 0);
        
        weeks.push({
          week: `W${weekNum}`,
          newMembers: totalNewMembers,
        });
        weekNum++;
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
    const maxNew = Math.max(...data.map(d => d.newMembers || 0));
    return Math.ceil(maxNew / 10) * 10 + 20;
  }, [data]);

  return (
    <section 
      className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="member-growth-title"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 id="member-growth-title" className="text-base sm:text-lg font-semibold text-gray-900">
              新增會員趨勢
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
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
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
          <AreaChart 
            data={data}
            margin={isMobile ? { top: 5, right: 5, left: 0, bottom: 5 } : { top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorNewMembers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
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
              width={isMobile ? 30 : 40}
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, yAxisMax]}
              dx={isMobile ? -4 : -8}
            />
            <Tooltip 
              content={renderTooltip}
              wrapperStyle={tooltipWrapperStyle}
              contentStyle={tooltipContentStyle}
            />
            <Area
              type="monotone"
              dataKey="newMembers"
              name="新增會員"
              stroke="#06B6D4"
              strokeWidth={2}
              fill="url(#colorNewMembers)"
              dot={{ fill: '#06B6D4', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#67E8F9' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export default MemberGrowthTrend;
