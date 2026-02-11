'use client';

import { memo, useState, useMemo } from 'react';
import { Image, X, TrendingUp, DollarSign, Eye, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

// Types
export interface AdCreative {
  id: string;
  report_date: string;
  week_start: string;
  week_end: string;
  creative_name: string | null;
  ad_id: string | null;
  campaign_name: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  metrics: {
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    roas?: number;
    purchases?: number;
    conv_value?: number;
  };
  performance_tier: 'high' | 'medium' | 'low' | null;
  performance_rank: number | null;
  vision_analysis: {
    dominant_colors?: string[];
    detected_objects?: string[];
    text_detected?: string;
    composition_score?: number;
  } | null;
  success_factors: string[] | null;
  failure_factors: string[] | null;
  improvement_suggestions: string[] | null;
  tags: string[] | null;
}

interface CreativeAnalysisProps {
  creatives: AdCreative[];
  isLoading?: boolean;
}

const TIER_CONFIG = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🏆 高效' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚡ 中等' },
  low: { bg: 'bg-red-100', text: 'text-red-700', label: '⚠️ 待優化' },
};

const CreativeAnalysis = memo(function CreativeAnalysis({ 
  creatives, 
  isLoading = false 
}: CreativeAnalysisProps) {
  const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null);
  
  // 只顯示 Top 5
  const topCreatives = useMemo(() => 
    creatives
      .filter(c => c.performance_rank !== null)
      .sort((a, b) => (a.performance_rank ?? 999) - (b.performance_rank ?? 999))
      .slice(0, 5),
    [creatives]
  );

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (topCreatives.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">廣告素材分析</h2>
            <p className="text-xs text-gray-500">本週 Top 5 素材表現</p>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>尚無廣告素材數據</p>
          <p className="text-xs mt-1">請在 Supabase 新增 ad_creatives 資料</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section 
        className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
        aria-labelledby="creative-analysis-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 id="creative-analysis-title" className="text-base sm:text-lg font-semibold text-gray-900">
                廣告素材分析
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">本週 Top 5 素材表現</p>
            </div>
          </div>
          <span className="badge badge-pink text-[10px] sm:text-xs">
            AI 分析
          </span>
        </div>

        {/* Creative Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {topCreatives.map((creative, index) => {
            const tier = creative.performance_tier || 'medium';
            const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.medium;
            
            return (
              <button
                key={creative.id}
                onClick={() => setSelectedCreative(creative)}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 border-2 border-transparent hover:border-indigo-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={`查看素材 ${creative.creative_name || creative.ad_id} 詳情`}
              >
                {/* Thumbnail */}
                {creative.thumbnail_url || creative.image_url ? (
                  <img
                    src={creative.thumbnail_url || creative.image_url || ''}
                    alt={creative.creative_name || `素材 ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Rank Badge */}
                <div className="absolute top-2 left-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                  <span className="text-xs sm:text-sm font-bold text-gray-800">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                </div>

                {/* Tier Badge */}
                <div className={cn(
                  "absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold",
                  tierConfig.bg, tierConfig.text
                )}>
                  {tierConfig.label}
                </div>

                {/* Metrics on Hover */}
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      ROAS {(creative.metrics?.roas || 0).toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(creative.metrics?.spend || 0)}
                    </span>
                  </div>
                </div>

                {/* View More Indicator */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tags Summary */}
        {topCreatives.some(c => c.tags && c.tags.length > 0) && (
          <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">常見標籤</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(topCreatives.flatMap(c => c.tags || []))).slice(0, 8).map(tag => (
                <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedCreative && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedCreative(null)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCreative.creative_name || `素材 ${selectedCreative.ad_id}`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedCreative.campaign_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedCreative(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="關閉"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                {selectedCreative.image_url ? (
                  <img
                    src={selectedCreative.image_url}
                    alt={selectedCreative.creative_name || '素材圖片'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Analysis */}
              <div className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs text-gray-500 mb-1">ROAS</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {(selectedCreative.metrics?.roas || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-gray-500 mb-1">花費</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(selectedCreative.metrics?.spend || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-xs text-gray-500 mb-1">點擊率</p>
                    <p className="text-xl font-bold text-purple-600">
                      {(selectedCreative.metrics?.ctr || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-gray-500 mb-1">購買數</p>
                    <p className="text-xl font-bold text-amber-600">
                      {selectedCreative.metrics?.purchases || 0}
                    </p>
                  </div>
                </div>

                {/* Success Factors */}
                {selectedCreative.success_factors && selectedCreative.success_factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <span className="text-emerald-500">✅</span> 成功因素
                    </p>
                    <ul className="space-y-1.5">
                      {selectedCreative.success_factors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Failure Factors */}
                {selectedCreative.failure_factors && selectedCreative.failure_factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <span className="text-red-500">⚠️</span> 待改善
                    </p>
                    <ul className="space-y-1.5">
                      {selectedCreative.failure_factors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement Suggestions */}
                {selectedCreative.improvement_suggestions && selectedCreative.improvement_suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <span className="text-indigo-500">💡</span> 優化建議
                    </p>
                    <ul className="space-y-1.5">
                      {selectedCreative.improvement_suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {selectedCreative.tags && selectedCreative.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">標籤</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCreative.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default CreativeAnalysis;
