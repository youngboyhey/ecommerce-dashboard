'use client';

import { formatCurrency, formatNumber, formatPercent, getChangeColor, getChangeIcon, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percent' | 'roas';
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function KPICard({ 
  title, 
  value, 
  format, 
  change, 
  changeLabel = '較上週',
  icon,
  className 
}: KPICardProps) {
  const formatValue = () => {
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
  };

  const TrendIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <p className="text-3xl font-bold text-gray-900 mb-2">
        {formatValue()}
      </p>
      
      {change !== undefined && (
        <div className="flex items-center gap-1">
          <TrendIcon className={cn("w-4 h-4", getChangeColor(change))} />
          <span className={cn("text-sm font-medium", getChangeColor(change))}>
            {getChangeIcon(change)} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-sm text-gray-400 ml-1">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
