'use client';

import { memo, useState, useCallback } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Lightbulb,
  Users,
  Megaphone,
  ShoppingCart,
  Search,
  ChevronDown,
  Check,
  Clock,
  XCircle,
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface Insight {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'conversion' | 'traffic' | 'creative' | 'audience' | 'seo' | 'general';
  title: string;
  finding: string;
  recommendation: string;
  expected_impact: string | { metric?: string; estimate?: string };
  data_points?: Record<string, unknown>;
}

export interface WeeklyInsight {
  id: string;
  report_date: string;
  week_start: string;
  week_end: string;
  insights: Insight[];
  summary: {
    total_insights: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    key_theme?: string;
  } | null;
}

export interface InsightTracking {
  id: string;
  weekly_insight_id: string;
  insight_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  status_notes: string | null;
  result_summary: string | null;
}

interface WeeklyInsightsProps {
  weeklyInsight: WeeklyInsight | null;
  trackingData: InsightTracking[];
  isLoading?: boolean;
  onStatusChange?: (insightId: string, status: InsightTracking['status'], notes?: string) => Promise<void>;
}

// Priority config
const PRIORITY_CONFIG = {
  critical: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500', label: '🔴 緊急' },
  high: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500', label: '🟠 高' },
  medium: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500', label: '🟡 中' },
  low: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500', label: '🔵 低' },
};

// Category config
const CATEGORY_CONFIG = {
  conversion: { icon: Target, label: '轉換率', color: 'text-emerald-600' },
  traffic: { icon: TrendingUp, label: '流量', color: 'text-blue-600' },
  creative: { icon: Megaphone, label: '素材', color: 'text-pink-600' },
  audience: { icon: Users, label: '受眾', color: 'text-purple-600' },
  seo: { icon: Search, label: 'SEO', color: 'text-cyan-600' },
  general: { icon: Lightbulb, label: '一般', color: 'text-gray-600' },
};

// Status config
const STATUS_CONFIG = {
  pending: { icon: Clock, label: '待執行', bg: 'bg-gray-100', text: 'text-gray-600' },
  in_progress: { icon: AlertTriangle, label: '進行中', bg: 'bg-blue-100', text: 'text-blue-600' },
  completed: { icon: Check, label: '已完成', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  skipped: { icon: SkipForward, label: '跳過', bg: 'bg-gray-100', text: 'text-gray-400' },
};

const WeeklyInsights = memo(function WeeklyInsights({ 
  weeklyInsight, 
  trackingData,
  isLoading = false,
  onStatusChange
}: WeeklyInsightsProps) {
  
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!weeklyInsight || weeklyInsight.insights.length === 0) {
    return (
      <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50" />
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-indigo-100/50 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">本週洞察</h2>
              <p className="text-xs text-gray-500">AI 驅動的智慧建議</p>
            </div>
          </div>
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>尚無本週洞察數據</p>
            <p className="text-xs mt-1">請在 Supabase 新增 weekly_insights 資料</p>
          </div>
        </div>
      </section>
    );
  }

  // Build tracking map
  const trackingMap = new Map(
    trackingData.map(t => [t.insight_id, t])
  );

  // Sort insights by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedInsights = [...weeklyInsight.insights].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <section 
      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100 relative overflow-hidden"
      aria-labelledby="weekly-insights-title"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50" />
      <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-indigo-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-purple-100/50 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 id="weekly-insights-title" className="text-base sm:text-lg font-semibold text-gray-900">
                本週洞察
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                {weeklyInsight.week_start} ~ {weeklyInsight.week_end}
              </p>
            </div>
          </div>
          
          {/* Summary Badges */}
          {weeklyInsight.summary && (
            <div className="flex items-center gap-2 flex-wrap">
              {weeklyInsight.summary.critical_count > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  🔴 {weeklyInsight.summary.critical_count} 緊急
                </span>
              )}
              {weeklyInsight.summary.high_count > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  🟠 {weeklyInsight.summary.high_count} 高
                </span>
              )}
              {weeklyInsight.summary.medium_count > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  🟡 {weeklyInsight.summary.medium_count} 中
                </span>
              )}
            </div>
          )}
        </div>

        {/* Key Theme */}
        {weeklyInsight.summary?.key_theme && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-indigo-600">📌 本週主題：</span>
              {weeklyInsight.summary.key_theme}
            </p>
          </div>
        )}

        {/* Insight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {sortedInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              tracking={trackingMap.get(insight.id)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200/50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            共 {weeklyInsight.insights.length} 個洞察 • 由龍蝦企業 🦞 AI 分析
          </p>
          <span className="badge badge-purple text-[10px] sm:text-xs">
            AI 驅動
          </span>
        </div>
      </div>
    </section>
  );
});

// Insight Card Component
interface InsightCardProps {
  insight: Insight;
  tracking?: InsightTracking;
  onStatusChange?: (insightId: string, status: InsightTracking['status'], notes?: string) => Promise<void>;
}

const InsightCard = memo(function InsightCard({ 
  insight, 
  tracking,
  onStatusChange 
}: InsightCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const priorityConfig = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.medium;
  const categoryConfig = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig?.icon || Lightbulb;
  
  const currentStatus = tracking?.status || 'pending';
  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig.icon;

  const handleStatusChange = useCallback(async (newStatus: InsightTracking['status']) => {
    if (!onStatusChange || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(insight.id, newStatus);
    } finally {
      setIsUpdating(false);
      setIsDropdownOpen(false);
    }
  }, [insight.id, onStatusChange, isUpdating]);

  return (
    <article 
      className={cn(
        "p-4 rounded-xl border-2 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
        priorityConfig.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold",
            priorityConfig.bg, priorityConfig.text
          )}>
            {priorityConfig.label}
          </span>
          
          {/* Category */}
          <span className={cn(
            "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
            categoryConfig.color
          )}>
            <CategoryIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {categoryConfig.label}
          </span>
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={!onStatusChange || isUpdating}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-colors",
              statusConfig.bg, statusConfig.text,
              onStatusChange && "hover:opacity-80 cursor-pointer",
              isUpdating && "opacity-50"
            )}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{statusConfig.label}</span>
            {onStatusChange && <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && onStatusChange && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                {(Object.keys(STATUS_CONFIG) as Array<InsightTracking['status']>).map((status) => {
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                        currentStatus === status && "bg-gray-50"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", config.text)} />
                      <span className={config.text}>{config.label}</span>
                      {currentStatus === status && (
                        <Check className="w-3 h-3 ml-auto text-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
        {insight.title}
      </h3>

      {/* Finding */}
      <div className="mb-3">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">📊 發現</p>
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          {insight.finding}
        </p>
      </div>

      {/* Recommendation */}
      <div className="mb-3 p-2 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <p className="text-[10px] sm:text-xs font-medium text-indigo-700 mb-1">💡 建議</p>
        <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed">
          {insight.recommendation}
        </p>
      </div>

      {/* Expected Impact */}
      <div className="flex items-start gap-1.5 text-xs text-gray-600">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p>
          <span className="font-medium text-emerald-600">預期效果：</span>
          {typeof insight.expected_impact === 'string' 
            ? insight.expected_impact 
            : insight.expected_impact?.estimate || '待評估'}
        </p>
      </div>

      {/* Notes (if any) */}
      {tracking?.status_notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-500">
            📝 {tracking.status_notes}
          </p>
        </div>
      )}

      {/* Result Summary (if completed) */}
      {tracking?.status === 'completed' && tracking.result_summary && (
        <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-[10px] font-medium text-emerald-700 mb-0.5">✅ 執行結果</p>
          <p className="text-xs text-emerald-800">{tracking.result_summary}</p>
        </div>
      )}
    </article>
  );
});

export default WeeklyInsights;
