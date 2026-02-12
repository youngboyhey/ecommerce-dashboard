'use client';

import { memo, useMemo, useState } from 'react';
import { FileText, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Lightbulb, ChevronDown, ChevronUp, Sparkles, Target, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdMetrics } from '@/contexts/AdMetricsContext';

// Types
export interface AdCopy {
  id: string;
  report_date: string;
  week_start: string;
  week_end: string;
  ad_id: string | null;
  campaign_name: string | null;
  copy_type: 'primary_text' | 'headline' | 'description' | null;
  copy_content: string;
  copy_length: number | null;
  metrics: {
    ctr?: number;
    cvr?: number;
    clicks?: number;
    impressions?: number;
    purchases?: number;
    conversions?: number;
    spend?: number;
  };
  performance_tier: 'high' | 'low' | null;
  performance_rank: number | null;
  analysis: {
    sentiment?: string;
    tone?: string;
    call_to_action?: string;
    urgency_level?: string;
    overall_score?: number;
    headline_score?: number;
    benefit_score?: number;
    cta_score?: number;
    emotional_triggers?: string[];
  } | null;
  feature_tags: {
    has_emoji?: boolean;
    has_number?: boolean;
    has_question?: boolean;
    has_cta?: boolean;
    has_discount?: boolean;
    has_urgency?: boolean;
  } | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  suggested_variations: string[] | null;
}

interface CopyAnalysisProps {
  copies: AdCopy[];
  isLoading?: boolean;
}

const COPY_TYPE_LABELS: Record<string, string> = {
  primary_text: '主要文案',
  headline: '標題',
  description: '描述',
};

const FEATURE_TAG_CONFIG: Record<string, { label: string; emoji: string }> = {
  has_emoji: { label: 'Emoji', emoji: '😊' },
  has_number: { label: '數字', emoji: '🔢' },
  has_question: { label: '問句', emoji: '❓' },
  has_cta: { label: 'CTA', emoji: '👆' },
  has_discount: { label: '折扣', emoji: '💰' },
  has_urgency: { label: '急迫感', emoji: '⏰' },
};

const CopyAnalysis = memo(function CopyAnalysis({ 
  copies, 
  isLoading = false 
}: CopyAnalysisProps) {
  const [expandedInsights, setExpandedInsights] = useState(false);
  
  // 從統一的 AdMetrics Context 獲取數據
  const { getAdMetrics, isLoading: metricsLoading } = useAdMetrics();

  // 用統一 metrics 豐富 copies 數據
  const enrichedCopies = useMemo<AdCopy[]>(() => {
    return copies.map(copy => {
      // 嘗試從統一數據源獲取 metrics
      const adId = copy.ad_id;
      if (!adId) return copy;
      
      const unifiedMetrics = getAdMetrics(adId);
      if (unifiedMetrics) {
        return {
          ...copy,
          metrics: {
            ...copy.metrics,
            spend: unifiedMetrics.spend,
            impressions: unifiedMetrics.impressions,
            clicks: unifiedMetrics.clicks,
            purchases: unifiedMetrics.purchases,
            ctr: unifiedMetrics.ctr,
            cvr: unifiedMetrics.cvr,
          },
        };
      }
      
      return copy;
    });
  }, [copies, getAdMetrics]);

  // 分類高效與低效文案
  const { highPerformers, lowPerformers } = useMemo(() => {
    const high = enrichedCopies
      .filter(c => c.performance_tier === 'high')
      .sort((a, b) => (a.performance_rank ?? 999) - (b.performance_rank ?? 999))
      .slice(0, 3);
    
    const low = enrichedCopies
      .filter(c => c.performance_tier === 'low')
      .sort((a, b) => (b.performance_rank ?? 0) - (a.performance_rank ?? 0))
      .slice(0, 3);
    
    return { highPerformers: high, lowPerformers: low };
  }, [enrichedCopies]);

  // 彙整所有高效文案的分析洞察
  const aggregatedInsights = useMemo(() => {
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const tones: string[] = [];
    const emotionalTriggers: string[] = [];
    const ctaPatterns: string[] = [];
    
    highPerformers.forEach(copy => {
      if (copy.strengths) allStrengths.push(...copy.strengths);
      if (copy.analysis?.tone) tones.push(copy.analysis.tone);
      if (copy.analysis?.emotional_triggers) emotionalTriggers.push(...copy.analysis.emotional_triggers);
      if (copy.analysis?.call_to_action) ctaPatterns.push(copy.analysis.call_to_action);
    });

    lowPerformers.forEach(copy => {
      if (copy.weaknesses) allWeaknesses.push(...copy.weaknesses);
    });

    // 去重並取前幾項
    const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
    const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 5);
    const uniqueTones = [...new Set(tones)].slice(0, 3);
    const uniqueTriggers = [...new Set(emotionalTriggers)].slice(0, 5);
    const uniqueCTAs = [...new Set(ctaPatterns)].slice(0, 3);

    return {
      strengths: uniqueStrengths,
      weaknesses: uniqueWeaknesses,
      tones: uniqueTones,
      emotionalTriggers: uniqueTriggers,
      ctaPatterns: uniqueCTAs,
      hasData: uniqueStrengths.length > 0 || uniqueWeaknesses.length > 0 || uniqueTones.length > 0,
    };
  }, [highPerformers, lowPerformers]);

  if (isLoading || metricsLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (enrichedCopies.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">廣告文案分析</h2>
            <p className="text-xs text-gray-500">高效 vs 低效文案對比</p>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>尚無廣告文案數據</p>
          <p className="text-xs mt-1">請在 Supabase 新增 ad_copies 資料</p>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="copy-analysis-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 id="copy-analysis-title" className="text-base sm:text-lg font-semibold text-gray-900">
              廣告文案分析
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">高效 vs 低效文案對比</p>
          </div>
        </div>
        <span className="badge badge-purple text-[10px] sm:text-xs">
          A/B 洞察
        </span>
      </div>

      {/* Two Column Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* High Performers */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">🟢 高效文案</span>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {highPerformers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                尚無高效文案數據
              </div>
            ) : (
              highPerformers.map((copy) => (
                <CopyCard key={copy.id} copy={copy} variant="high" />
              ))
            )}
          </div>
        </div>

        {/* Low Performers */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-semibold">🔴 低效文案</span>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {lowPerformers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                尚無低效文案數據
              </div>
            ) : (
              lowPerformers.map((copy) => (
                <CopyCard key={copy.id} copy={copy} variant="low" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Key Insights Footer - 全新設計 */}
      {(highPerformers.length > 0 || lowPerformers.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setExpandedInsights(!expandedInsights)}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:border-indigo-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-medium text-gray-900">AI 文案洞察分析</span>
            </div>
            {expandedInsights ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedInsights && (
            <div className="mt-4 space-y-4">
              {/* 高效文案成功原因 */}
              {aggregatedInsights.strengths.length > 0 && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">高效文案成功原因</span>
                  </div>
                  <ul className="space-y-2">
                    {aggregatedInsights.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 低效文案問題診斷 */}
              {aggregatedInsights.weaknesses.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">低效文案問題診斷</span>
                  </div>
                  <ul className="space-y-2">
                    {aggregatedInsights.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 文案風格與策略 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 語調分析 */}
                {aggregatedInsights.tones.length > 0 && (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-800">有效語調</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aggregatedInsights.tones.map((tone, i) => (
                        <span 
                          key={i}
                          className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium"
                        >
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 情緒觸發點 */}
                {aggregatedInsights.emotionalTriggers.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">情緒觸發點</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aggregatedInsights.emotionalTriggers.map((trigger, i) => (
                        <span 
                          key={i}
                          className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA 模式 */}
              {aggregatedInsights.ctaPatterns.length > 0 && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-800">有效 CTA 模式</span>
                  </div>
                  <div className="space-y-2">
                    {aggregatedInsights.ctaPatterns.map((cta, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-indigo-500">→</span>
                        <span className="text-sm text-indigo-700">「{cta}」</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 無分析數據的 Fallback */}
              {!aggregatedInsights.hasData && (
                <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">尚無 AI 分析數據</p>
                  <p className="text-xs mt-1">請確保文案有填寫 strengths、weaknesses 等分析欄位</p>
                </div>
              )}
            </div>
          )}

          {/* 收合時的簡短預覽 */}
          {!expandedInsights && aggregatedInsights.hasData && (
            <div className="mt-3 flex flex-wrap gap-2">
              {aggregatedInsights.strengths.slice(0, 2).map((s, i) => (
                <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                  ✓ {s.length > 20 ? s.slice(0, 20) + '...' : s}
                </span>
              ))}
              {aggregatedInsights.tones.slice(0, 1).map((t, i) => (
                <span key={i} className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs">
                  🗣️ {t}
                </span>
              ))}
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                點擊展開完整分析 →
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
});

// Copy Card Component
interface CopyCardProps {
  copy: AdCopy;
  variant: 'high' | 'low';
}

const CopyCard = memo(function CopyCard({ copy, variant }: CopyCardProps) {
  const isHigh = variant === 'high';
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
  // 計算 CVR（優先使用 conversions，fallback 到 purchases）
  const calculatedCvr = useMemo(() => {
    const clicks = copy.metrics?.clicks || 0;
    const conversions = copy.metrics?.conversions ?? copy.metrics?.purchases ?? 0;
    if (clicks > 0) {
      return (conversions / clicks) * 100;
    }
    // Fallback 到預存的 cvr 值
    return copy.metrics?.cvr || 0;
  }, [copy.metrics]);
  
  // 組合分析說明
  const analysisDetails = useMemo(() => {
    const details: string[] = [];
    
    if (copy.analysis?.tone) {
      details.push(`語調：${copy.analysis.tone}`);
    }
    if (copy.analysis?.sentiment) {
      details.push(`情感：${copy.analysis.sentiment}`);
    }
    if (copy.analysis?.urgency_level) {
      details.push(`急迫感：${copy.analysis.urgency_level}`);
    }
    if (copy.analysis?.overall_score !== undefined) {
      details.push(`評分：${copy.analysis.overall_score}/10`);
    }
    
    return details;
  }, [copy.analysis]);
  
  return (
    <article 
      className={cn(
        "p-4 rounded-xl border transition-all duration-200",
        isHigh 
          ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300" 
          : "bg-red-50/50 border-red-200 hover:border-red-300"
      )}
    >
      {/* Copy Type & Campaign */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full",
          isHigh ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {COPY_TYPE_LABELS[copy.copy_type || ''] || copy.copy_type}
        </span>
        {copy.campaign_name && (
          <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
            {copy.campaign_name}
          </span>
        )}
      </div>

      {/* Copy Content */}
      <p className="text-sm text-gray-800 mb-3 line-clamp-3 leading-relaxed">
        "{copy.copy_content}"
      </p>

      {/* Metrics */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">CTR</span>
          <span className={cn(
            "text-xs font-semibold",
            isHigh ? "text-emerald-600" : "text-red-600"
          )}>
            {(copy.metrics?.ctr || 0).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">CVR</span>
          <span className={cn(
            "text-xs font-semibold",
            isHigh ? "text-emerald-600" : "text-red-600"
          )}>
            {calculatedCvr.toFixed(2)}%
          </span>
        </div>
        {copy.copy_length && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">字數</span>
            <span className="text-xs font-medium text-gray-600">
              {copy.copy_length}
            </span>
          </div>
        )}
        {copy.analysis?.overall_score !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">評分</span>
            <span className={cn(
              "text-xs font-semibold",
              copy.analysis.overall_score >= 7 ? "text-emerald-600" : 
              copy.analysis.overall_score >= 4 ? "text-amber-600" : "text-red-600"
            )}>
              {copy.analysis.overall_score}/10
            </span>
          </div>
        )}
      </div>

      {/* Feature Tags */}
      {copy.feature_tags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(copy.feature_tags)
            .filter(([_, value]) => value)
            .map(([key]) => {
              const config = FEATURE_TAG_CONFIG[key];
              if (!config) return null;
              return (
                <span 
                  key={key} 
                  className="px-1.5 py-0.5 bg-white rounded text-[10px] text-gray-600 border border-gray-200"
                >
                  {config.emoji} {config.label}
                </span>
              );
            })}
        </div>
      )}

      {/* Detailed Scores - 詳細評分 */}
      {copy.analysis && (copy.analysis.headline_score !== undefined || copy.analysis.benefit_score !== undefined || copy.analysis.cta_score !== undefined) && (
        <div className={cn(
          "flex flex-wrap gap-2 mb-3 p-2 rounded-lg",
          isHigh ? "bg-emerald-50/50" : "bg-red-50/50"
        )}>
          {copy.analysis.headline_score !== undefined && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-500">📝 標題</span>
              <span className={cn(
                "font-semibold",
                copy.analysis.headline_score >= 7 ? "text-emerald-600" : 
                copy.analysis.headline_score >= 4 ? "text-amber-600" : "text-red-600"
              )}>
                {copy.analysis.headline_score}/10
              </span>
            </div>
          )}
          {copy.analysis.benefit_score !== undefined && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-500">✨ 賣點</span>
              <span className={cn(
                "font-semibold",
                copy.analysis.benefit_score >= 7 ? "text-emerald-600" : 
                copy.analysis.benefit_score >= 4 ? "text-amber-600" : "text-red-600"
              )}>
                {copy.analysis.benefit_score}/10
              </span>
            </div>
          )}
          {copy.analysis.cta_score !== undefined && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-500">👆 CTA</span>
              <span className={cn(
                "font-semibold",
                copy.analysis.cta_score >= 7 ? "text-emerald-600" : 
                copy.analysis.cta_score >= 4 ? "text-amber-600" : "text-red-600"
              )}>
                {copy.analysis.cta_score}/10
              </span>
            </div>
          )}
        </div>
      )}

      {/* Analysis Details - 為什麼效果好/差 */}
      {(analysisDetails.length > 0 || copy.strengths?.length || copy.weaknesses?.length) && (
        <div className={cn(
          "pt-3 border-t",
          isHigh ? "border-emerald-200/50" : "border-red-200/50"
        )}>
          {/* Strengths (高效文案) */}
          {isHigh && copy.strengths && copy.strengths.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">為什麼效果好</span>
              </div>
              <ul className="space-y-1">
                {copy.strengths.map((strength, i) => (
                  <li key={i} className="text-[11px] text-emerald-700 pl-5 relative">
                    <span className="absolute left-0 top-0.5 text-emerald-500">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses (低效文案) */}
          {!isHigh && copy.weaknesses && copy.weaknesses.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700">為什麼效果差</span>
              </div>
              <ul className="space-y-1">
                {copy.weaknesses.map((weakness, i) => (
                  <li key={i} className="text-[11px] text-red-700 pl-5 relative">
                    <span className="absolute left-0 top-0.5 text-red-500">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analysis Details Toggle */}
          {analysisDetails.length > 0 && (
            <button
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 mt-2"
            >
              <Sparkles className="w-3 h-3" />
              <span>{showFullAnalysis ? '收起分析' : '查看詳細分析'}</span>
              {showFullAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {showFullAnalysis && analysisDetails.length > 0 && (
            <div className="mt-2 p-2 bg-white/50 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {analysisDetails.map((detail, i) => (
                  <span key={i} className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {detail}
                  </span>
                ))}
              </div>
              {copy.analysis?.emotional_triggers && copy.analysis.emotional_triggers.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] text-gray-500">情緒觸發：</span>
                  <span className="text-[10px] text-gray-700">
                    {copy.analysis.emotional_triggers.join('、')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggested Variations for Low Performers */}
      {!isHigh && copy.suggested_variations && copy.suggested_variations.length > 0 && (
        <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-[10px] font-medium text-amber-700 mb-1">💡 建議改寫：</p>
          <p className="text-[11px] text-amber-800 line-clamp-2">
            {copy.suggested_variations[0]}
          </p>
        </div>
      )}
    </article>
  );
});

export default CopyAnalysis;
