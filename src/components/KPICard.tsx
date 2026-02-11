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
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconShadow: 'shadow-emerald-500/30',
    accentColor: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  orders: {
    gradient: 'from-blue-500/20 to-blue-600/10',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconShadow: 'shadow-blue-500/30',
    accentColor: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  roas: {
    gradient: 'from-purple-500/20 to-purple-600/10',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconShadow: 'shadow-purple-500/30',
    accentColor: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  members: {
    gradient: 'from-pink-500/20 to-pink-600/10',
    iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    iconShadow: 'shadow-pink-500/30',
    accentColor: 'text-pink-400',
    border: 'border-pink-500/20',
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
        // 玻璃擬態基底
        "glass-card rounded-2xl p-6 relative overflow-hidden group",
        // 主題漸層背景
        `bg-gradient-to-br ${config.gradient}`,
        config.border,
        className
      )}
      aria-label={`${title}: ${formattedValue}`}
    >
      {/* 背景裝飾 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500" />
      
      {/* Header with Icon */}
      <div className="relative flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        {icon && (
          <div 
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
              config.iconBg,
              config.iconShadow
            )}
            aria-hidden="true"
          >
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>
      
      {/* Main Value */}
      <p className="relative text-3xl font-bold text-white tracking-tight mb-3 font-mono-nums">
        {formattedValue}
      </p>
      
      {/* Change Indicator */}
      {change !== undefined && (
        <div 
          className="relative flex items-center gap-1.5"
          role="status"
          aria-label={`${isPositive ? '增長' : isNegative ? '下降' : '持平'} ${Math.abs(change).toFixed(1)}% ${changeLabel}`}
        >
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
            isPositive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
            isNegative ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
          )}>
            <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-slate-500">{changeLabel}</span>
        </div>
      )}
    </article>
  );
});

export default KPICard;
