'use client';

import { memo, useMemo } from 'react';
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KPITheme = 'revenue' | 'orders' | 'roas' | 'members';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percent' | 'roas';
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  theme?: KPITheme;
  className?: string;
}

const THEME_CONFIG = {
  revenue: {
    gradient: 'from-white to-white',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconShadow: 'shadow-emerald-500/30',
    accentColor: 'text-emerald-600',
    border: 'border-emerald-100',
  },
  orders: {
    gradient: 'from-white to-white',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    iconShadow: 'shadow-indigo-500/30',
    accentColor: 'text-indigo-600',
    border: 'border-indigo-100',
  },
  roas: {
    gradient: 'from-white to-white',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconShadow: 'shadow-purple-500/30',
    accentColor: 'text-purple-600',
    border: 'border-purple-100',
  },
  members: {
    gradient: 'from-white to-white',
    iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    iconShadow: 'shadow-pink-500/30',
    accentColor: 'text-pink-600',
    border: 'border-pink-100',
  },
};

const KPICard = memo(function KPICard({ 
  title, 
  value, 
  format, 
  change, 
  changeLabel = '較上週',
  icon,
  theme = 'revenue',
  className 
}: KPICardProps) {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'roas':
        return value.toFixed(2);
      default:
        return formatNumber(value);
    }
  }, [format, value]);

  const config = THEME_CONFIG[theme];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <article 
      className={cn(
        // 白卡片基底 - RWD 優化
        "bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 relative overflow-hidden group",
        "shadow-lg shadow-gray-200/50",
        "border border-gray-100",
        "hover:shadow-xl hover:shadow-gray-200/60 transition-all duration-300",
        className
      )}
      aria-label={`${title}: ${formattedValue}`}
    >
      {/* 背景漸層裝飾 */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        config.gradient
      )} />
      <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/60 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500" />
      
      {/* Header with Icon */}
      <div className="relative flex items-center justify-between mb-2 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div 
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg",
              config.iconBg,
              config.iconShadow
            )}
            aria-hidden="true"
          >
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>
      
      {/* Main Value - RWD 優化，避免截斷 */}
      <p className="relative text-xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2 sm:mb-3 font-mono-nums truncate">
        {formattedValue}
      </p>
      
      {/* Change Indicator */}
      {change !== undefined && (
        <div 
          className="relative flex flex-wrap items-center gap-1 sm:gap-1.5"
          role="status"
          aria-label={`${isPositive ? '增長' : isNegative ? '下降' : '持平'} ${Math.abs(change).toFixed(1)}% ${changeLabel}`}
        >
          <div className={cn(
            "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
            isPositive ? 'bg-emerald-100 text-emerald-700' : 
            isNegative ? 'bg-red-100 text-red-700' : 
            'bg-gray-100 text-gray-600'
          )}>
            <TrendIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-400">{changeLabel}</span>
        </div>
      )}
    </article>
  );
});

export default KPICard;
