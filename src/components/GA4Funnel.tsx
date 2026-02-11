'use client';

import { mockReportData } from '@/lib/mockData';
import { formatNumber, formatPercent } from '@/lib/utils';

export default function GA4Funnel() {
  const { ga4 } = mockReportData;
  const { funnel_rates } = ga4;

  const funnelSteps = [
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
      rate: funnel_rates.session_to_atc,
      dropOff: funnel_rates.atc_drop_off
    },
    { 
      name: '開始結帳', 
      value: ga4.ic, 
      icon: '💳',
      color: 'from-orange-500 to-orange-600',
      rate: funnel_rates.atc_to_checkout,
      dropOff: funnel_rates.checkout_drop_off
    },
    { 
      name: '完成購買', 
      value: ga4.purchases, 
      icon: '✅',
      color: 'from-green-500 to-green-600',
      rate: funnel_rates.checkout_to_purchase,
      dropOff: null
    }
  ];

  const maxValue = Math.max(...funnelSteps.map(s => s.value));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">🔄 GA4 轉換漏斗</h2>
        <div className="text-sm text-gray-500">
          整體轉換率: <span className="font-bold text-green-600">{formatPercent(funnel_rates.overall_conversion)}</span>
        </div>
      </div>

      <div className="space-y-4">
        {funnelSteps.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const prevStep = index > 0 ? funnelSteps[index - 1] : null;
          const conversionFromPrev = prevStep ? (step.value / prevStep.value * 100) : 100;

          return (
            <div key={step.name} className="relative">
              {/* Conversion Arrow */}
              {index > 0 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 text-xs font-medium">
                    <span className={conversionFromPrev < 50 ? 'text-red-600' : 'text-green-600'}>
                      {conversionFromPrev.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="text-2xl w-10 text-center">{step.icon}</div>

                {/* Progress Bar Container */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{step.name}</span>
                    <span className="text-sm font-bold text-gray-900">{formatNumber(step.value)}</span>
                  </div>
                  <div className="h-10 bg-gray-100 rounded-lg overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${step.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-3`}
                      style={{ width: `${widthPercent}%` }}
                    >
                      {widthPercent > 20 && (
                        <span className="text-white text-xs font-medium">
                          {((step.value / funnelSteps[0].value) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                {step.dropOff !== null && (
                  <div className="w-16 text-right">
                    <span className="text-xs text-red-500">
                      -{step.dropOff.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{formatNumber(ga4.active_users)}</p>
          <p className="text-xs text-gray-500">活躍用戶</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{formatPercent(funnel_rates.session_to_atc)}</p>
          <p className="text-xs text-gray-500">加購率</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{formatPercent(funnel_rates.overall_conversion)}</p>
          <p className="text-xs text-gray-500">轉換率</p>
        </div>
      </div>
    </div>
  );
}
