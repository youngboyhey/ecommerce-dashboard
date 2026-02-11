'use client';

import { memo, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Monitor, Smartphone, Tablet, TrendingUp, TrendingDown, Clock, MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GA4DeviceData } from '@/lib/types';

// 裝置數據類型（組件內部使用）
export interface DeviceData {
  device: 'desktop' | 'mobile' | 'tablet';
  sessions: number;
  sessionPercent: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgSessionDuration: number; // 秒
  pagesPerSession: number;
}

interface DeviceBreakdownProps {
  data?: GA4DeviceData[];  // 接收 GA4 原始數據格式
  className?: string;
  isLive?: boolean; // 標示數據是否為真實數據
}

// 預設模擬數據
const defaultData: DeviceData[] = [
  { 
    device: 'mobile', 
    sessions: 515, 
    sessionPercent: 72.0,
    conversions: 4,
    conversionRate: 0.78,
    bounceRate: 62.5,
    avgSessionDuration: 95,
    pagesPerSession: 2.8
  },
  { 
    device: 'desktop', 
    sessions: 172, 
    sessionPercent: 24.1,
    conversions: 3,
    conversionRate: 1.74,
    bounceRate: 45.2,
    avgSessionDuration: 156,
    pagesPerSession: 4.2
  },
  { 
    device: 'tablet', 
    sessions: 28, 
    sessionPercent: 3.9,
    conversions: 0,
    conversionRate: 0,
    bounceRate: 58.3,
    avgSessionDuration: 112,
    pagesPerSession: 3.1
  },
];

// 裝置顏色配置
const DEVICE_COLORS = {
  mobile: { main: '#3B82F6', light: '#DBEAFE', text: '#1D4ED8' },
  desktop: { main: '#8B5CF6', light: '#EDE9FE', text: '#6D28D9' },
  tablet: { main: '#EC4899', light: '#FCE7F3', text: '#BE185D' },
};

// 裝置圖標
const getDeviceIcon = (device: DeviceData['device']) => {
  switch (device) {
    case 'desktop':
      return <Monitor className="w-5 h-5" />;
    case 'mobile':
      return <Smartphone className="w-5 h-5" />;
    case 'tablet':
      return <Tablet className="w-5 h-5" />;
  }
};

// 裝置名稱
const getDeviceName = (device: DeviceData['device']) => {
  switch (device) {
    case 'desktop':
      return '桌機';
    case 'mobile':
      return '手機';
    case 'tablet':
      return '平板';
  }
};

// 格式化時間
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 自訂 Tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DeviceData & { name: string } }>;
}

const CustomTooltip = memo(function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const colors = DEVICE_COLORS[data.device];

  return (
    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: colors.light, color: colors.text }}
        >
          {getDeviceIcon(data.device)}
        </div>
        <span className="font-semibold text-gray-900">{getDeviceName(data.device)}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">工作階段</span>
          <span className="font-medium">{data.sessions.toLocaleString()} ({data.sessionPercent}%)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">轉換率</span>
          <span className="font-medium">{data.conversionRate.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">跳出率</span>
          <span className="font-medium">{data.bounceRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
});

/**
 * 將 GA4DeviceData 轉換為組件內部使用的 DeviceData 格式
 */
function mapGA4ToDeviceData(ga4Data: GA4DeviceData[]): DeviceData[] {
  return ga4Data.map(d => ({
    device: d.device,
    sessions: d.sessions,
    sessionPercent: d.session_pct,
    conversions: d.transactions,
    conversionRate: d.conv_rate,
    // 以下是 GA4 原始數據沒有的欄位，使用預設值
    bounceRate: 50, // 預設跳出率
    avgSessionDuration: 120, // 預設停留時間 2 分鐘
    pagesPerSession: 3.0, // 預設頁面數
  }));
}

const DeviceBreakdown = memo(function DeviceBreakdown({ 
  data,
  className,
  isLive = false
}: DeviceBreakdownProps) {
  // 將 GA4 數據映射到組件格式，如果沒有數據則使用模擬數據
  const mappedData = useMemo(() => {
    if (data && data.length > 0) {
      return mapGA4ToDeviceData(data);
    }
    return defaultData;
  }, [data]);
  
  // 判斷是否使用模擬數據
  const actualData = mappedData;
  const isUsingMockData = !data || data.length === 0 || !isLive;
  // 準備圓餅圖數據
  const pieData = useMemo(() => 
    actualData.map(d => ({
      ...d,
      name: getDeviceName(d.device),
      value: d.sessions,
    })),
    [actualData]
  );

  // 計算洞察
  const insights = useMemo(() => {
    const mobile = actualData.find(d => d.device === 'mobile');
    const desktop = actualData.find(d => d.device === 'desktop');
    
    if (!mobile || !desktop) return null;

    const mobileShare = mobile.sessionPercent;
    const conversionRatio = desktop.conversionRate / mobile.conversionRate;

    return {
      mobileShare,
      conversionRatio: conversionRatio.toFixed(1),
      isMobileDominant: mobileShare > 60,
      hasConversionGap: conversionRatio > 1.5,
    };
  }, [actualData]);

  return (
    <section 
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100 p-6",
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 圓餅圖 */}
        <div className="flex items-center justify-center">
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell 
                      key={entry.device} 
                      fill={DEVICE_COLORS[entry.device].main}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 裝置列表 */}
        <div className="space-y-3">
          {actualData.map((device) => {
            const colors = DEVICE_COLORS[device.device];
            const isTopDevice = device.sessionPercent === Math.max(...actualData.map(d => d.sessionPercent));
            
            return (
              <div 
                key={device.device}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  isTopDevice 
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" 
                    : "bg-gray-50 border-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: colors.light, color: colors.text }}
                    >
                      {getDeviceIcon(device.device)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{getDeviceName(device.device)}</p>
                      <p className="text-sm text-gray-500">
                        {device.sessions.toLocaleString()} 工作階段
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className="text-2xl font-bold"
                      style={{ color: colors.text }}
                    >
                      {device.sessionPercent}%
                    </p>
                  </div>
                </div>

                {/* 詳細指標 */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs">轉換率</span>
                    </div>
                    <p className={cn(
                      "font-semibold text-sm",
                      device.conversionRate > 1 ? "text-emerald-600" : "text-gray-700"
                    )}>
                      {device.conversionRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                      <TrendingDown className="w-3 h-3" />
                      <span className="text-xs">跳出率</span>
                    </div>
                    <p className={cn(
                      "font-semibold text-sm",
                      device.bounceRate > 60 ? "text-red-600" : "text-gray-700"
                    )}>
                      {device.bounceRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">停留</span>
                    </div>
                    <p className="font-semibold text-sm text-gray-700">
                      {formatDuration(device.avgSessionDuration)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 洞察區 */}
      {insights && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MousePointer className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">💡 數據洞察</h4>
              <p className="text-sm text-blue-800">
                {insights.isMobileDominant && (
                  <>Mobile 流量佔 {insights.mobileShare.toFixed(0)}%</>
                )}
                {insights.isMobileDominant && insights.hasConversionGap && '，但'}
                {insights.hasConversionGap && (
                  <>桌機轉換率是手機的 <span className="font-bold">{insights.conversionRatio} 倍</span></>
                )}
                {insights.isMobileDominant && insights.hasConversionGap && (
                  <>，建議優化行動版購物體驗</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default DeviceBreakdown;
