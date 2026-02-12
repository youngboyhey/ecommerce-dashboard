'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Clock,
  Check,
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyInsight, InsightTracking } from '@/components/WeeklyInsights';

// 警示類型定義
interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'ads' | 'conversion' | 'inventory' | 'general';
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  action?: string;
}

interface InsightsBannerProps {
  // Meta Ads 數據
  cpm?: number;
  frequency?: number;
  roas?: number;
  // 營收數據
  todayOrders?: number;
  bounceRate?: number;
  cartAbandonRate?: number;
  // CPA 相關
  cpa?: number;
  targetCpa?: number;
  // 本週洞察數據
  weeklyInsight: WeeklyInsight | null;
  trackingData: InsightTracking[];
  isLoading?: boolean;
  onStatusChange?: (insightId: string, status: InsightTracking['status'], notes?: string) => Promise<void>;
  className?: string;
}

// 警示閾值配置
const THRESHOLDS = {
  roas: { warning: 2.0, critical: 1.5 },
  cpm: { warning: 350, critical: 400 },
  frequency: { warning: 2.0, critical: 2.5 },
  cpaMultiplier: { warning: 1.2, critical: 1.5 },
  bounceRate: { warning: 60, critical: 75 },
  cartAbandonRate: { warning: 70, critical: 85 },
};

// Status config
const STATUS_CONFIG = {
  pending: { icon: Clock, label: '待執行', bg: 'bg-gray-100', text: 'text-gray-600' },
  in_progress: { icon: AlertTriangle, label: '進行中', bg: 'bg-blue-100', text: 'text-blue-600' },
  completed: { icon: Check, label: '已完成', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  skipped: { icon: SkipForward, label: '跳過', bg: 'bg-gray-100', text: 'text-gray-400' },
};

const InsightsBanner = memo(function InsightsBanner({
  cpm = 0,
  frequency = 0,
  roas = 0,
  todayOrders = 0,
  bounceRate = 0,
  cartAbandonRate = 0,
  cpa = 0,
  targetCpa = 500,
  weeklyInsight,
  trackingData,
  isLoading = false,
  onStatusChange,
  className,
}: InsightsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 生成警示列表
  const alerts = useMemo(() => {
    const alertList: Alert[] = [];

    // 檢查 ROAS
    if (roas > 0 && roas < THRESHOLDS.roas.critical) {
      alertList.push({
        id: 'roas-critical',
        type: 'critical',
        category: 'ads',
        title: '廣告虧損警告',
        message: `ROAS 僅 ${roas.toFixed(2)}，低於損益平衡點`,
        metric: 'ROAS',
        value: roas,
        threshold: THRESHOLDS.roas.critical,
        action: '建議立即檢視廣告組合，暫停低效素材',
      });
    } else if (roas > 0 && roas < THRESHOLDS.roas.warning) {
      alertList.push({
        id: 'roas-warning',
        type: 'warning',
        category: 'ads',
        title: 'ROAS 偏低',
        message: `ROAS ${roas.toFixed(2)} 接近警戒線`,
        metric: 'ROAS',
        value: roas,
        threshold: THRESHOLDS.roas.warning,
      });
    }

    // 檢查 Frequency
    if (frequency >= THRESHOLDS.frequency.critical) {
      alertList.push({
        id: 'frequency-critical',
        type: 'critical',
        category: 'ads',
        title: '素材疲乏警告',
        message: `廣告頻率達 ${frequency.toFixed(1)}，受眾已重複看過多次`,
        metric: 'Frequency',
        value: frequency,
        threshold: THRESHOLDS.frequency.critical,
        action: '建議更換廣告素材或擴展受眾',
      });
    } else if (frequency >= THRESHOLDS.frequency.warning) {
      alertList.push({
        id: 'frequency-warning',
        type: 'warning',
        category: 'ads',
        title: '廣告頻率升高',
        message: `頻率 ${frequency.toFixed(1)}，即將進入疲乏區間`,
        metric: 'Frequency',
        value: frequency,
        threshold: THRESHOLDS.frequency.warning,
      });
    }

    // 檢查 CPM
    if (cpm >= THRESHOLDS.cpm.critical) {
      alertList.push({
        id: 'cpm-critical',
        type: 'critical',
        category: 'ads',
        title: '流量成本過高',
        message: `CPM 達 $${cpm.toFixed(0)}，千次曝光成本超標`,
        metric: 'CPM',
        value: cpm,
        threshold: THRESHOLDS.cpm.critical,
        action: '建議優化受眾定位或調整出價策略',
      });
    } else if (cpm >= THRESHOLDS.cpm.warning) {
      alertList.push({
        id: 'cpm-warning',
        type: 'warning',
        category: 'ads',
        title: 'CPM 接近警戒值',
        message: `CPM $${cpm.toFixed(0)} 需留意成本控制`,
        metric: 'CPM',
        value: cpm,
        threshold: THRESHOLDS.cpm.warning,
      });
    }

    // 檢查零訂單
    if (todayOrders === 0) {
      alertList.push({
        id: 'zero-orders',
        type: 'critical',
        category: 'conversion',
        title: '緊急：今日零訂單',
        message: '今天尚無任何訂單成交',
        metric: '訂單數',
        value: 0,
        action: '請立即檢查網站、金流、廣告狀態',
      });
    }

    // 檢查 CPA
    if (cpa > 0 && targetCpa > 0) {
      const cpaRatio = cpa / targetCpa;
      if (cpaRatio >= THRESHOLDS.cpaMultiplier.critical) {
        alertList.push({
          id: 'cpa-critical',
          type: 'critical',
          category: 'ads',
          title: '獲客成本超標',
          message: `CPA $${cpa.toFixed(0)}，超出目標 ${((cpaRatio - 1) * 100).toFixed(0)}%`,
          metric: 'CPA',
          value: cpa,
          threshold: targetCpa * THRESHOLDS.cpaMultiplier.critical,
        });
      } else if (cpaRatio >= THRESHOLDS.cpaMultiplier.warning) {
        alertList.push({
          id: 'cpa-warning',
          type: 'warning',
          category: 'ads',
          title: 'CPA 偏高',
          message: `CPA $${cpa.toFixed(0)}，接近警戒值`,
          metric: 'CPA',
          value: cpa,
          threshold: targetCpa * THRESHOLDS.cpaMultiplier.warning,
        });
      }
    }

    // 檢查跳出率
    if (bounceRate >= THRESHOLDS.bounceRate.critical) {
      alertList.push({
        id: 'bounce-critical',
        type: 'critical',
        category: 'conversion',
        title: '著陸頁需優化',
        message: `網站跳出率達 ${bounceRate.toFixed(0)}%，訪客快速離開`,
        metric: '跳出率',
        value: bounceRate,
        threshold: THRESHOLDS.bounceRate.critical,
        action: '建議檢查著陸頁載入速度與內容相關性',
      });
    } else if (bounceRate >= THRESHOLDS.bounceRate.warning) {
      alertList.push({
        id: 'bounce-warning',
        type: 'warning',
        category: 'conversion',
        title: '跳出率偏高',
        message: `跳出率 ${bounceRate.toFixed(0)}% 需關注`,
        metric: '跳出率',
        value: bounceRate,
        threshold: THRESHOLDS.bounceRate.warning,
      });
    }

    // 檢查購物車放棄率
    if (cartAbandonRate >= THRESHOLDS.cartAbandonRate.critical) {
      alertList.push({
        id: 'cart-critical',
        type: 'critical',
        category: 'conversion',
        title: '結帳流程問題',
        message: `購物車放棄率達 ${cartAbandonRate.toFixed(0)}%`,
        metric: '放棄率',
        value: cartAbandonRate,
        threshold: THRESHOLDS.cartAbandonRate.critical,
        action: '建議檢查結帳流程、運費設定、付款方式',
      });
    } else if (cartAbandonRate >= THRESHOLDS.cartAbandonRate.warning) {
      alertList.push({
        id: 'cart-warning',
        type: 'warning',
        category: 'conversion',
        title: '購物車放棄率偏高',
        message: `放棄率 ${cartAbandonRate.toFixed(0)}% 需優化`,
        metric: '放棄率',
        value: cartAbandonRate,
        threshold: THRESHOLDS.cartAbandonRate.warning,
      });
    }

    return alertList.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [roas, frequency, cpm, todayOrders, cpa, targetCpa, bounceRate, cartAbandonRate]);

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const hasAlerts = alerts.length > 0;

  // 洞察數據
  const highlights = weeklyInsight?.highlights || [];
  const warnings = weeklyInsight?.warnings || [];
  const recommendations = weeklyInsight?.recommendations || [];
  const hasInsights = highlights.length > 0 || warnings.length > 0 || recommendations.length > 0;

  // Loading 狀態
  if (isLoading) {
    return (
      <section className={cn("rounded-xl border bg-white overflow-hidden animate-pulse", className)}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-48"></div>
            <div className="h-3 bg-gray-100 rounded w-32 mt-2"></div>
          </div>
        </div>
      </section>
    );
  }

  // 正常狀態 - 無警示也無洞察
  if (!hasAlerts && !hasInsights) {
    return (
      <section 
        className={cn(
          "bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4",
          className
        )}
        aria-label="系統狀態正常"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800">營運狀態正常 ✨</h3>
            <p className="text-sm text-emerald-600">所有指標均在健康範圍內</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-300",
        criticalCount > 0 
          ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200" 
          : hasAlerts
            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
            : "bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200",
        className
      )}
      aria-label="營運狀態與本週洞察"
    >
      {/* Header - 可點擊展開/收合 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/30 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            criticalCount > 0 ? "bg-red-100" : hasAlerts ? "bg-amber-100" : "bg-indigo-100"
          )}>
            {criticalCount > 0 
              ? <XCircle className="w-5 h-5 text-red-600" />
              : hasAlerts 
                ? <AlertTriangle className="w-5 h-5 text-amber-600" />
                : <Sparkles className="w-5 h-5 text-indigo-600" />
            }
          </div>
          <div className="text-left">
            <h3 className={cn(
              "font-semibold flex flex-wrap items-center gap-2",
              criticalCount > 0 ? "text-red-800" : hasAlerts ? "text-amber-800" : "text-indigo-800"
            )}>
              {criticalCount > 0 && (
                <span className="text-red-700">🔴 嚴重警示 ({criticalCount})</span>
              )}
              {warningCount > 0 && (
                <span className={criticalCount > 0 ? "text-amber-700" : "text-amber-700"}>
                  🟡 需注意 ({warningCount})
                </span>
              )}
              {!hasAlerts && hasInsights && (
                <span className="text-indigo-700">💡 本週洞察</span>
              )}
              {hasInsights && (
                <span className="text-gray-500 text-sm font-normal">
                  • {highlights.length + warnings.length + recommendations.length} 項建議
                </span>
              )}
            </h3>
            <p className={cn(
              "text-sm",
              criticalCount > 0 ? "text-red-600" : hasAlerts ? "text-amber-600" : "text-indigo-600"
            )}>
              {isExpanded ? '點擊收合' : '點擊展開詳情'}
            </p>
          </div>
        </div>
        {isExpanded 
          ? <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        }
      </button>

      {/* 展開內容 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 警示列表 */}
          {hasAlerts && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                即時警示
              </h4>
              {alerts.map((alert) => (
                <article
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    alert.type === 'critical' 
                      ? "bg-red-50/80 border-red-200" 
                      : "bg-amber-50/80 border-amber-200"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "mt-0.5 p-1 rounded-full",
                      alert.type === 'critical' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {alert.type === 'critical' 
                        ? <XCircle className="w-4 h-4" />
                        : <AlertTriangle className="w-4 h-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className={cn(
                        "font-semibold text-sm",
                        alert.type === 'critical' ? "text-red-800" : "text-amber-800"
                      )}>
                        {alert.title}
                      </h5>
                      <p className={cn(
                        "text-sm",
                        alert.type === 'critical' ? "text-red-700" : "text-amber-700"
                      )}>
                        {alert.message}
                      </p>
                      {alert.action && (
                        <p className={cn(
                          "text-xs mt-1 px-2 py-1 rounded inline-block",
                          alert.type === 'critical' 
                            ? "bg-red-100 text-red-800" 
                            : "bg-amber-100 text-amber-800"
                        )}>
                          💡 {alert.action}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* 本週洞察 */}
          {hasInsights && (
            <div className="space-y-4">
              {hasAlerts && <div className="border-t border-gray-200 pt-4" />}
              
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                本週洞察
                {weeklyInsight?.week_start && (
                  <span className="font-normal text-gray-500">
                    ({weeklyInsight.week_start} ~ {weeklyInsight.week_end})
                  </span>
                )}
              </h4>

              {/* 本週亮點 */}
              {highlights.length > 0 && (
                <div className="p-3 bg-emerald-50/80 backdrop-blur-sm rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">✨</span>
                    <h5 className="font-semibold text-emerald-800 text-sm">本週亮點</h5>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                      {highlights.length}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-emerald-900">
                        <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 注意事項 */}
              {warnings.length > 0 && (
                <div className="p-3 bg-amber-50/80 backdrop-blur-sm rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">⚠️</span>
                    <h5 className="font-semibold text-amber-800 text-sm">注意事項</h5>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                      {warnings.length}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {warnings.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 行動建議 */}
              {recommendations.length > 0 && (
                <div className="p-3 bg-indigo-50/80 backdrop-blur-sm rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">💡</span>
                    <h5 className="font-semibold text-indigo-800 text-sm">行動建議</h5>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                      {recommendations.length}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              由龍蝦企業 🦞 AI 分析
            </p>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              AI 驅動
            </span>
          </div>
        </div>
      )}
    </section>
  );
});

export default InsightsBanner;
