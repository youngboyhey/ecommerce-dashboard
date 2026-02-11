'use client';

import { memo, useMemo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatNumber, formatPercent } from '@/lib/utils';

interface FunnelStep {
  name: string;
  value: number;
  icon: string;
  color: string;
  dropOff: number | null;
}

const GA4Funnel = memo(function GA4Funnel() {
  const { ga4 } = mockReportData;
  const { funnel_rates } = ga4;

  const funnelSteps = useMemo<FunnelStep[]>(() => [
    { 
      name: '訪客', 
      value: ga4.sessions, 
      icon: '👀',
      color: 'from-blue-500 to-blue-600',
      dropOff: null
    },
    { 
      name: '加入購物車', 
      value: ga4.atc, 
      icon: '🛒',
      color: 'from-purple-500 to-purple-600',
      dropOff: funnel_rates.atc_drop_off
    },
    { 
      name: '開始結帳', 
      value: ga4.ic, 
      icon: '💳',
      color: 'from-orange-500 to-orange-600',
      dropOff: funnel_rates.checkout_drop_off
    },
    { 
      name: '完成購買', 
      value: ga4.purchases, 
      icon: '✅',
      color: 'from-emerald-500 to-emerald-600',
      dropOff: null
    }
  ], [ga4, funnel_rates]);

  const maxValue = useMemo(() => 
    Math.max(...funnelSteps.map(s => s.value)), 
    [funnelSteps]
  );

  return (
    <section 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="ga4-funnel-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="ga4-funnel-title" className="text-lg font-semibold text-gray-900">
          🔄 GA4 轉換漏斗
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">整體轉換率</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
            {formatPercent(funnel_rates.overall_conversion)}
          </span>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div 
        className="space-y-6" 
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
              className="relative"
              role="listitem"
            >
              {/* Conversion Rate Badge */}
              {index > 0 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-bold shadow-sm border
                    ${conversionFromPrev < 30 
                      ? 'bg-red-50 text-red-700 border-red-100' 
                      : conversionFromPrev < 50 
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }
                  `}>
                    ↓ {conversionFromPrev.toFixed(1)}%
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="text-2xl w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl"
                  aria-hidden="true"
                >
                  {step.icon}
                </div>

                {/* Progress Bar Container */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{step.name}</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatNumber(step.value)}
                    </span>
                  </div>
                  <div 
                    className="h-10 bg-gray-100 rounded-xl overflow-hidden"
                    role="progressbar"
                    aria-valuenow={widthPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${step.name}: ${step.value}`}
                  >
                    <div 
                      className={`h-full bg-gradient-to-r ${step.color} rounded-xl transition-all duration-700 ease-out flex items-center justify-end pr-4`}
                      style={{ width: `${Math.max(widthPercent, 5)}%` }}
                    >
                      {widthPercent > 15 && (
                        <span className="text-white text-xs font-bold drop-shadow-sm">
                          {((step.value / funnelSteps[0].value) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                <div className="w-20 text-right">
                  {step.dropOff !== null ? (
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">
                      -{step.dropOff.toFixed(0)}% 流失
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
        <div className="text-center p-3 bg-blue-50/50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">
            {formatNumber(ga4.active_users)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">活躍用戶</p>
        </div>
        <div className="text-center p-3 bg-purple-50/50 rounded-xl">
          <p className="text-2xl font-bold text-purple-600">
            {formatPercent(funnel_rates.session_to_atc)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">加購率</p>
        </div>
        <div className="text-center p-3 bg-emerald-50/50 rounded-xl">
          <p className="text-2xl font-bold text-emerald-600">
            {formatPercent(funnel_rates.overall_conversion)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">轉換率</p>
        </div>
      </div>
    </section>
  );
});

export default GA4Funnel;
