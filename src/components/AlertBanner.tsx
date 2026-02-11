'use client';

import { memo, useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  TrendingDown,
  Zap,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 警示類型定義
export interface Alert {
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

interface AlertBannerProps {
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

const AlertBanner = memo(function AlertBanner({
  cpm = 0,
  frequency = 0,
  roas = 0,
  todayOrders = 0,
  bounceRate = 0,
  cartAbandonRate = 0,
  cpa = 0,
  targetCpa = 500,
  className,
}: AlertBannerProps) {
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

    // 檢查 Frequency（素材疲乏）
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

    // 檢查 CPM（流量成本）
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

    // 檢查零訂單（最緊急）
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

    // 按優先級排序：critical > warning > info
    return alertList.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [roas, frequency, cpm, todayOrders, cpa, targetCpa, bounceRate, cartAbandonRate]);

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const hasAlerts = alerts.length > 0;

  // 選擇圖標
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const getCategoryIcon = (category: Alert['category']) => {
    switch (category) {
      case 'ads':
        return <Zap className="w-4 h-4" />;
      case 'conversion':
        return <ShoppingCart className="w-4 h-4" />;
      case 'inventory':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <TrendingDown className="w-4 h-4" />;
    }
  };

  // 正常狀態
  if (!hasAlerts) {
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
          : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200",
        className
      )}
      aria-label="營運警示"
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
            criticalCount > 0 ? "bg-red-100" : "bg-amber-100"
          )}>
            {criticalCount > 0 
              ? <XCircle className="w-5 h-5 text-red-600" />
              : <AlertTriangle className="w-5 h-5 text-amber-600" />
            }
          </div>
          <div className="text-left">
            <h3 className={cn(
              "font-semibold",
              criticalCount > 0 ? "text-red-800" : "text-amber-800"
            )}>
              {criticalCount > 0 && (
                <span className="mr-2">🔴 嚴重警示 ({criticalCount})</span>
              )}
              {warningCount > 0 && (
                <span className={criticalCount > 0 ? "text-amber-700" : ""}>
                  🟡 需注意 ({warningCount})
                </span>
              )}
            </h3>
            <p className={cn(
              "text-sm",
              criticalCount > 0 ? "text-red-600" : "text-amber-600"
            )}>
              {isExpanded ? '點擊收合詳情' : '點擊展開詳情'}
            </p>
          </div>
        </div>
        {isExpanded 
          ? <ChevronUp className="w-5 h-5 text-gray-500" />
          : <ChevronDown className="w-5 h-5 text-gray-500" />
        }
      </button>

      {/* Alert List */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                "p-4 rounded-lg border",
                alert.type === 'critical' 
                  ? "bg-red-50/80 border-red-200" 
                  : "bg-amber-50/80 border-amber-200"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-full",
                  alert.type === 'critical' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                )}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      "font-semibold",
                      alert.type === 'critical' ? "text-red-800" : "text-amber-800"
                    )}>
                      {alert.title}
                    </h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                      alert.type === 'critical' 
                        ? "bg-red-100 text-red-700" 
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {getCategoryIcon(alert.category)}
                      {alert.category === 'ads' && '廣告'}
                      {alert.category === 'conversion' && '轉換'}
                      {alert.category === 'inventory' && '庫存'}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm mb-2",
                    alert.type === 'critical' ? "text-red-700" : "text-amber-700"
                  )}>
                    {alert.message}
                  </p>
                  {alert.action && (
                    <p className={cn(
                      "text-xs px-3 py-1.5 rounded-md inline-block",
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
    </section>
  );
});

export default AlertBanner;
