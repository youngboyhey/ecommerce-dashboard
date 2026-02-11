'use client';

import { memo, useMemo } from 'react';
import { FileText, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    spend?: number;
  };
  performance_tier: 'high' | 'low' | null;
  performance_rank: number | null;
  analysis: {
    sentiment?: string;
    tone?: string;
    call_to_action?: string;
    urgency_level?: string;
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
  // 分類高效與低效文案
  const { highPerformers, lowPerformers } = useMemo(() => {
    const high = copies
      .filter(c => c.performance_tier === 'high')
      .sort((a, b) => (a.performance_rank ?? 999) - (b.performance_rank ?? 999))
      .slice(0, 3);
    
    const low = copies
      .filter(c => c.performance_tier === 'low')
      .sort((a, b) => (b.performance_rank ?? 0) - (a.performance_rank ?? 0))
      .slice(0, 3);
    
    return { highPerformers: high, lowPerformers: low };
  }, [copies]);

  if (isLoading) {
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

  if (copies.length === 0) {
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

      {/* Key Insights Footer */}
      {(highPerformers.length > 0 || lowPerformers.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">文案洞察</p>
              <p className="text-xs text-gray-600">
                高效文案通常包含：
                {getCommonFeatures(highPerformers).join('、') || '無明確特徵'}
                。考慮在低效文案中加入這些元素。
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

// Helper function to get common features
function getCommonFeatures(copies: AdCopy[]): string[] {
  const features: string[] = [];
  const counts: Record<string, number> = {};
  
  copies.forEach(copy => {
    if (copy.feature_tags) {
      Object.entries(copy.feature_tags).forEach(([key, value]) => {
        if (value) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    }
  });
  
  Object.entries(counts)
    .filter(([_, count]) => count >= copies.length / 2)
    .forEach(([key]) => {
      const config = FEATURE_TAG_CONFIG[key];
      if (config) {
        features.push(`${config.emoji} ${config.label}`);
      }
    });
  
  return features;
}

// Copy Card Component
interface CopyCardProps {
  copy: AdCopy;
  variant: 'high' | 'low';
}

const CopyCard = memo(function CopyCard({ copy, variant }: CopyCardProps) {
  const isHigh = variant === 'high';
  
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
            {(copy.metrics?.cvr || 0).toFixed(2)}%
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

      {/* Strengths & Weaknesses */}
      {isHigh && copy.strengths && copy.strengths.length > 0 && (
        <div className="pt-2 border-t border-emerald-200/50">
          <div className="flex items-start gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-700 line-clamp-2">
              {copy.strengths.join('、')}
            </p>
          </div>
        </div>
      )}

      {!isHigh && copy.weaknesses && copy.weaknesses.length > 0 && (
        <div className="pt-2 border-t border-red-200/50">
          <div className="flex items-start gap-1.5">
            <ThumbsDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700 line-clamp-2">
              {copy.weaknesses.join('、')}
            </p>
          </div>
        </div>
      )}

      {/* Suggested Variations for Low Performers */}
      {!isHigh && copy.suggested_variations && copy.suggested_variations.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
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
