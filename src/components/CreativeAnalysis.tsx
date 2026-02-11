'use client';

import { memo, useState, useMemo } from 'react';
import { Image, X, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, Lightbulb, Palette, Type, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  carousel_images?: string[] | null; // 輪播圖片陣列
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
    composition?: string;
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
  const [expandedCarousel, setExpandedCarousel] = useState<string | null>(null);
  
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

  // 取得簡短的 AI 分析摘要
  const getAnalysisSummary = (creative: AdCreative): string | null => {
    if (creative.success_factors && creative.success_factors.length > 0) {
      return creative.success_factors[0];
    }
    if (creative.vision_analysis?.composition) {
      return creative.vision_analysis.composition;
    }
    if (creative.improvement_suggestions && creative.improvement_suggestions.length > 0) {
      return creative.improvement_suggestions[0];
    }
    return null;
  };

  // 檢查是否為輪播廣告
  const isCarousel = (creative: AdCreative): boolean => {
    return !!(creative.carousel_images && creative.carousel_images.length > 1);
  };

  // 取得所有圖片（包含主圖和輪播圖）
  const getAllImages = (creative: AdCreative): string[] => {
    const images: string[] = [];
    if (creative.image_url) images.push(creative.image_url);
    if (creative.carousel_images) {
      creative.carousel_images.forEach(img => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    return images;
  };

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
            const analysisSummary = getAnalysisSummary(creative);
            const hasCarousel = isCarousel(creative);
            const isExpanded = expandedCarousel === creative.id;
            const allImages = getAllImages(creative);
            
            return (
              <div key={creative.id} className="relative">
                <button
                  onClick={() => setSelectedCreative(creative)}
                  className="group relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 border-2 border-transparent hover:border-indigo-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
                  
                  {/* Overlay with AI Analysis Summary */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
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

                  {/* Carousel Indicator */}
                  {hasCarousel && (
                    <div className="absolute top-10 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[8px] sm:text-[10px] font-medium text-white flex items-center gap-1">
                      <span>📷</span>
                      <span>{allImages.length}</span>
                    </div>
                  )}

                  {/* AI Analysis on Hover (取代原本的 ROAS、花費) */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {analysisSummary ? (
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-300" />
                        <p className="text-[10px] sm:text-xs line-clamp-2 leading-relaxed">
                          {analysisSummary}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-white/70 text-center">
                        點擊查看詳細分析
                      </p>
                    )}
                  </div>
                </button>

                {/* Expand Carousel Button */}
                {hasCarousel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCarousel(isExpanded ? null : creative.id);
                    }}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] rounded-full shadow-md transition-colors z-10"
                  >
                    {isExpanded ? '收起' : `展開 ${allImages.length} 張`}
                  </button>
                )}

                {/* Expanded Carousel Images */}
                {isExpanded && allImages.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-4 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {allImages.map((img, imgIndex) => (
                        <div 
                          key={imgIndex}
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                          onClick={() => setSelectedCreative(creative)}
                        >
                          <img
                            src={img}
                            alt={`輪播圖 ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
        <CreativeDetailModal 
          creative={selectedCreative} 
          onClose={() => setSelectedCreative(null)} 
        />
      )}
    </>
  );
});

// Creative Detail Modal Component
interface CreativeDetailModalProps {
  creative: AdCreative;
  onClose: () => void;
}

const CreativeDetailModal = memo(function CreativeDetailModal({ 
  creative, 
  onClose 
}: CreativeDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 取得所有圖片
  const allImages = useMemo(() => {
    const images: string[] = [];
    if (creative.image_url) images.push(creative.image_url);
    if (creative.carousel_images) {
      creative.carousel_images.forEach(img => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    return images.length > 0 ? images : [];
  }, [creative]);

  const hasMultipleImages = allImages.length > 1;

  const goToPrevImage = () => {
    setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {creative.creative_name || `素材 ${creative.ad_id}`}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {creative.campaign_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Carousel */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImageIndex]}
                    alt={`${creative.creative_name || '素材圖片'} - ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={goToPrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        aria-label="上一張"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={goToNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        aria-label="下一張"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Strip for Carousel */}
            {hasMultipleImages && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIndex 
                        ? "border-indigo-500 ring-2 ring-indigo-200" 
                        : "border-transparent hover:border-gray-300"
                    )}
                  >
                    <img
                      src={img}
                      alt={`縮圖 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis (取代原本的成效數據) */}
          <div className="space-y-4">
            {/* Vision Analysis */}
            {creative.vision_analysis && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  AI 視覺分析
                </p>
                <div className="space-y-2.5">
                  {/* Composition */}
                  {creative.vision_analysis.composition && (
                    <div className="flex items-start gap-2">
                      <Layout className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">構圖</span>
                        <p className="text-sm text-gray-700">{creative.vision_analysis.composition}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Colors */}
                  {creative.vision_analysis.dominant_colors && creative.vision_analysis.dominant_colors.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Palette className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">主色調</span>
                        <div className="flex gap-1.5 mt-1">
                          {creative.vision_analysis.dominant_colors.slice(0, 5).map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Detected */}
                  {creative.vision_analysis.text_detected && (
                    <div className="flex items-start gap-2">
                      <Type className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">偵測到的文字</span>
                        <p className="text-sm text-gray-700 line-clamp-2">{creative.vision_analysis.text_detected}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success Factors */}
            {creative.success_factors && creative.success_factors.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <span className="text-emerald-500">✅</span> 成功因素
                </p>
                <ul className="space-y-1.5">
                  {creative.success_factors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failure Factors */}
            {creative.failure_factors && creative.failure_factors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> 待改善
                </p>
                <ul className="space-y-1.5">
                  {creative.failure_factors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement Suggestions */}
            {creative.improvement_suggestions && creative.improvement_suggestions.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> 優化建議
                </p>
                <ul className="space-y-1.5">
                  {creative.improvement_suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No Analysis Available */}
            {!creative.vision_analysis && 
             !creative.success_factors?.length && 
             !creative.failure_factors?.length && 
             !creative.improvement_suggestions?.length && (
              <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">尚無 AI 分析數據</p>
                <p className="text-xs mt-1">分析將於資料同步後自動產生</p>
              </div>
            )}

            {/* Tags */}
            {creative.tags && creative.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">標籤</p>
                <div className="flex flex-wrap gap-2">
                  {creative.tags.map(tag => (
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
  );
});

export default CreativeAnalysis;
