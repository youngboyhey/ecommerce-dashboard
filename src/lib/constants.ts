// 設計系統常數配置

// 色彩系統 - 統一的語義化色彩
export const COLORS = {
  // 主色調
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  // 成功/增長
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
  },
  // 警告/下降
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
  },
  // 次要色
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  // 中性色
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// 圖表色彩調色盤
export const CHART_COLORS = {
  // 主要系列色
  series: [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#6366F1', // Indigo
  ],
  // 營收相關
  revenue: '#3B82F6',
  revenueGradient: 'url(#colorRevenue)',
  // 花費相關
  spend: '#EF4444',
  // ROAS 相關
  roas: '#10B981',
  // 性別分佈
  gender: ['#3B82F6', '#EC4899', '#9CA3AF'],
  // 年齡分佈漸層
  age: ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  // 獎牌顏色
  medals: {
    gold: 'from-yellow-400 to-yellow-500',
    silver: 'from-gray-300 to-gray-400',
    bronze: 'from-orange-300 to-orange-400',
    default: 'from-blue-300 to-blue-400',
  },
} as const;

// KPI 卡片主題配置
export const KPI_THEMES = {
  revenue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  spend: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
  },
  roas: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  orders: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    gradient: 'from-amber-500 to-amber-600',
  },
} as const;

// 間距系統 (8pt grid)
export const SPACING = {
  xs: 4,   // 4px
  sm: 8,   // 8px
  md: 16,  // 16px
  lg: 24,  // 24px
  xl: 32,  // 32px
  '2xl': 48, // 48px
} as const;

// 字型大小系統
export const TYPOGRAPHY = {
  // 標題
  h1: 'text-2xl font-bold',
  h2: 'text-lg font-semibold',
  h3: 'text-base font-medium',
  // 內文
  body: 'text-sm',
  bodySmall: 'text-xs',
  // 數據顯示
  kpiLarge: 'text-3xl font-bold tracking-tight',
  kpiMedium: 'text-xl font-bold',
  kpiSmall: 'text-lg font-semibold',
  // 標籤
  label: 'text-sm font-medium text-gray-500',
  labelSmall: 'text-xs font-medium text-gray-400',
} as const;

// 陰影系統
export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  card: 'shadow-sm hover:shadow-md transition-shadow',
} as const;

// 圓角系統
export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

// 動畫時長
export const TRANSITIONS = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const;
