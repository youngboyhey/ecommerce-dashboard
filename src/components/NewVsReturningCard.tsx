'use client';

import { memo, useMemo } from 'react';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/utils';

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

interface NewVsReturningCardProps {
  data?: GA4Data;
}

const NewVsReturningCard = memo(function NewVsReturningCard({ data }: NewVsReturningCardProps) {
  // 估算新訪客 vs 回訪客
  // 業界平均：新訪客約佔 60-70%，回訪客約佔 30-40%
  // 使用 active_users / sessions 比率來動態調整
  const visitorStats = useMemo(() => {
    if (!data) {
      return { newUsers: 0, returningUsers: 0, newPercent: 0, returningPercent: 0 };
    }

    const { active_users, sessions } = data;
    
    // 計算用戶與工作階段的比率
    // 如果 sessions >> active_users，表示有更多回訪客
    const repeatVisitRatio = sessions / Math.max(active_users, 1);
    
    // 基礎新客比例 65%，根據重複訪問比率調整
    // 比率越高，回訪客越多
    const baseNewPercent = 65;
    const adjustedNewPercent = Math.min(85, Math.max(35, baseNewPercent - (repeatVisitRatio - 1) * 15));
    
    const newUsers = Math.round(active_users * (adjustedNewPercent / 100));
    const returningUsers = active_users - newUsers;
    
    const total = active_users;
    const newPercent = total > 0 ? (newUsers / total) * 100 : 0;
    const returningPercent = total > 0 ? (returningUsers / total) * 100 : 0;

    return { newUsers, returningUsers, newPercent, returningPercent, total };
  }, [data]);

  const { newUsers, returningUsers, newPercent, returningPercent, total } = visitorStats;

  return (
    <section 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="visitor-type-title"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 id="visitor-type-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          新客 vs 回訪客
        </h2>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          估算值
        </span>
      </div>

      {/* Progress Bar Visualization */}
      <div className="mb-6">
        <div 
          className="h-8 bg-gray-100 rounded-full overflow-hidden flex"
          role="progressbar"
          aria-label="新客與回訪客比例"
        >
          {/* New Users Bar */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center transition-all duration-500"
            style={{ width: `${newPercent}%` }}
          >
            {newPercent > 15 && (
              <span className="text-white text-xs font-bold drop-shadow-sm">
                {newPercent.toFixed(0)}%
              </span>
            )}
          </div>
          {/* Returning Users Bar */}
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center transition-all duration-500"
            style={{ width: `${returningPercent}%` }}
          >
            {returningPercent > 15 && (
              <span className="text-white text-xs font-bold drop-shadow-sm">
                {returningPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* New Users */}
        <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">新訪客</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-1">
            {formatNumber(newUsers)}
          </p>
          <p className="text-xs text-gray-500">
            佔總體 <span className="font-semibold text-blue-600">{newPercent.toFixed(1)}%</span>
          </p>
        </div>

        {/* Returning Users */}
        <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">回訪客</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mb-1">
            {formatNumber(returningUsers)}
          </p>
          <p className="text-xs text-gray-500">
            佔總體 <span className="font-semibold text-emerald-600">{returningPercent.toFixed(1)}%</span>
          </p>
        </div>
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          總活躍用戶：<span className="font-semibold text-gray-700">{formatNumber(total || 0)}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="w-2 h-2 bg-purple-500 rounded-full" />
          總工作階段：<span className="font-semibold text-gray-700">{formatNumber(data?.sessions || 0)}</span>
        </p>
      </div>
    </section>
  );
});

export default NewVsReturningCard;
