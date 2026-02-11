'use client';

import { memo, useMemo } from 'react';
import { formatCurrency, formatNumber, formatPercent, getChangeColor, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPI_THEMES } from '@/lib/constants';

export type KPITheme = keyof typeof KPI_THEMES;

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

  const themeConfig = KPI_THEMES[theme];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <article 
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-6",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        className
      )}
      aria-label={`${title}: ${formattedValue}`}
    >
      {/* Header with Icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div 
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              themeConfig.iconBg
            )}
            aria-hidden="true"
          >
            <div className={themeConfig.iconColor}>{icon}</div>
          </div>
        )}
      </div>
      
      {/* Main Value */}
      <p className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
        {formattedValue}
      </p>
      
      {/* Change Indicator */}
      {change !== undefined && (
        <div 
          className="flex items-center gap-1.5"
          role="status"
          aria-label={`${isPositive ? '增長' : isNegative ? '下降' : '持平'} ${Math.abs(change).toFixed(1)}% ${changeLabel}`}
        >
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
            isPositive ? 'bg-green-50 text-green-700' : 
            isNegative ? 'bg-red-50 text-red-700' : 
            'bg-gray-50 text-gray-600'
          )}>
            <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      )}
    </article>
  );
});

export default KPICard;
