'use client';

import { memo, useMemo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatNumber, formatPercent } from '@/lib/utils';
import { Filter } from 'lucide-react';

interface GA4Data {
  active_users: number;
  sessions: number;
  atc: number;
  ic: number;
  purchases: number;
  ecommerce_purchases?: number;
  purchase_revenue: number;
  funnel_rates: {
    session_to_atc: number;
    atc_to_checkout: number;
    checkout_to_purchase: number;
    overall_conversion: number;
    atc_drop_off: number;
    checkout_drop_off: number;
    purchase_drop_off: number;
  };
}

interface GA4FunnelProps {
  data?: GA4Data;
}

interface FunnelStep {
  name: string;
  value: number;
  icon: string;
  gradient: string;
  dropOff: number | null;
}

const GA4Funnel = memo(function GA4Funnel({ data: propData }: GA4FunnelProps) {
  const ga4 = propData || mockReportData.ga4;
  const { funnel_rates } = ga4;

  const funnelSteps = useMemo<FunnelStep[]>(() => [
    { 
      name: '訪客', 
      value: ga4.sessions, 
      icon: '👀',
      gradient: 'from-blue-500 to-blue-600',
      dropOff: null
    },
    { 
      name: '加入購物車', 
      value: ga4.atc, 
      icon: '🛒',
      gradient: 'from-purple-500 to-purple-600',
      dropOff: funnel_rates.atc_drop_off
    },
    { 
      name: '開始結帳', 
      value: ga4.ic, 
      icon: '💳',
      gradient: 'from-orange-500 to-orange-600',
      dropOff: funnel_rates.checkout_drop_off
    },
    { 
      name: '完成購買', 
      value: ga4.purchases, 
      icon: '✅',
      gradient: 'from-emerald-500 to-emerald-600',
      dropOff: null
    }
  ], [ga4, funnel_rates]);

  const maxValue = useMemo(() => 
    Math.max(...funnelSteps.map(s => s.value)), 
    [funnelSteps]
  );

  return (
    <section 
      className="glass-card rounded-2xl p-6"
      aria-labelledby="ga4-funnel-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="ga4-funnel-title" className="text-lg font-semibold text-white">
              GA4 轉換漏斗
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">用戶轉換路徑分析</p>
          </div>
        </div>
        <div className="badge badge-success">
          <span className="font-bold">{formatPercent(funnel_rates.overall_conversion)}</span>
          <span className="text-emerald-300/70 ml-1">轉換率</span>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div 
        className="space-y-8" 
        role="list" 
        aria-label="轉換漏斗步驟"
      >
        {funnelSteps.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const prevStep = index > 0 ? funnelSteps[index - 1] : null;
          const conversionFromPrev = prevStep ? (step.value / prevStep.value * 100) : 100;

          return (
            <div 
              key={step.name} 
              className="relative group"
              role="listitem"
            >
              {/* Conversion Rate Badge */}
              {index > 0 && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm border
                    ${conversionFromPrev < 30 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                      : conversionFromPrev < 50 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }
                  `}>
                    ↓ {conversionFromPrev.toFixed(1)}%
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="text-2xl w-12 h-12 flex items-center justify-center glass-inner rounded-xl group-hover:scale-110 transition-transform duration-300"
                  aria-hidden="true"
                >
                  {step.icon}
                </div>

                {/* Progress Bar Container */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-200">{step.name}</span>
                    <span className="text-base font-bold text-white font-mono-nums">
                      {formatNumber(step.value)}
                    </span>
                  </div>
                  <div 
                    className="h-10 bg-white/5 rounded-xl overflow-hidden border border-white/5"
                    role="progressbar"
                    aria-valuenow={widthPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${step.name}: ${step.value}`}
                  >
                    <div 
                      className={`h-full bg-gradient-to-r ${step.gradient} rounded-xl transition-all duration-700 ease-out flex items-center justify-end pr-4 relative overflow-hidden`}
                      style={{ width: `${Math.max(widthPercent, 5)}%` }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 animate-shimmer" />
                      {widthPercent > 15 && (
                        <span className="relative text-white text-xs font-bold drop-shadow-lg">
                          {((step.value / funnelSteps[0].value) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                <div className="w-24 text-right">
                  {step.dropOff !== null ? (
                    <span className="badge badge-danger text-xs">
                      -{step.dropOff.toFixed(0)}% 流失
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
        <div className="text-center p-4 glass-inner rounded-xl">
          <p className="text-2xl font-bold text-blue-400 font-mono-nums">
            {formatNumber(ga4.active_users)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">活躍用戶</p>
        </div>
        <div className="text-center p-4 glass-inner rounded-xl">
          <p className="text-2xl font-bold text-purple-400 font-mono-nums">
            {formatPercent(funnel_rates.session_to_atc)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">加購率</p>
        </div>
        <div className="text-center p-4 glass-inner rounded-xl">
          <p className="text-2xl font-bold text-emerald-400 font-mono-nums">
            {formatPercent(funnel_rates.overall_conversion)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">轉換率</p>
        </div>
      </div>
    </section>
  );
});

export default GA4Funnel;
