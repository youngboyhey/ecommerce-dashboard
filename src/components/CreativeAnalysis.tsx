'use client';

import { memo, useState, useMemo, useRef } from 'react';
import { Image, X, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, Lightbulb, Palette, Type, Layout, TrendingUp, DollarSign, MousePointer, ShoppingCart } from 'lucide-react';
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
  carousel_images?: string[] | null;
  metrics: {
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    roas?: number;
    purchases?: number;
    conv_value?: number;
    cvr?: number;
  };
  performance_tier: 'high' | 'medium' | 'low' | null;
  performance_rank: number | null;
  vision_analysis: {
    dominant_colors?: string[];
    detected_objects?: string[];
    text_detected?: string;
    composition?: string;
    composition_score?: number;
    visual_elements?: string[];
    color_scheme?: string[];
    text_overlay?: string;
    emotion_appeal?: string;
    product_presentation?: string;
  } | null;
  success_factors: string[] | null;
  failure_factors: string[] | null;
  improvement_suggestions: string[] | null;
  tags: string[] | null;
}

// Grouped Ad interface
interface GroupedAd {
  originalAdId: string;
  adName: string;
  campaignName: string;
  metrics: {
    spend: number;
    roas: number;
    ctr: number;
    cvr: number;
    impressions: number;
    clicks: number;
    purchases: number;
  };
  performanceTier: 'high' | 'medium' | 'low';
  images: {
    url: string;
    index: number;
    visionAnalysis: AdCreative['vision_analysis'];
  }[];
  combinedAnalysis: {
    visualElements: string[];
    colorScheme: string[];
    emotionAppeal: string[];
    productPresentation: string[];
    successFactors: string[];
    failureFactors: string[];
    improvementSuggestions: string[];
  };
}

interface CreativeAnalysisProps {
  creatives: AdCreative[];
  isLoading?: boolean;
}

const TIER_CONFIG = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🏆 高效', border: 'border-emerald-200' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚡ 中等', border: 'border-amber-200' },
  low: { bg: 'bg-red-100', text: 'text-red-700', label: '⚠️ 待優化', border: 'border-red-200' },
};

// Helper function to extract original_ad_id from tags
const getOriginalAdId = (tags: string[] | null): string | null => {
  if (!tags) return null;
  const tag = tags.find(t => t.startsWith('original_ad_id:'));
  return tag ? tag.replace('original_ad_id:', '') : null;
};

// Helper function to extract carousel_index from tags
const getCarouselIndex = (tags: string[] | null): number => {
  if (!tags) return 0;
  const tag = tags.find(t => t.startsWith('carousel_index:'));
  return tag ? parseInt(tag.replace('carousel_index:', ''), 10) : 0;
};

// Helper function to get clean ad name (remove [x/y] suffix)
const getCleanAdName = (name: string | null): string => {
  if (!name) return '未命名廣告';
  return name.replace(/\s*\[\d+\/\d+\]\s*$/, '').trim();
};

// Group creatives by original_ad_id
const groupCreativesByAd = (creatives: AdCreative[]): GroupedAd[] => {
  const groups = new Map<string, AdCreative[]>();
  
  creatives.forEach(creative => {
    const originalId = getOriginalAdId(creative.tags);
    const key = originalId || creative.ad_id || creative.id;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(creative);
  });
  
  return Array.from(groups.entries()).map(([originalAdId, items]) => {
    // Sort by carousel index
    items.sort((a, b) => getCarouselIndex(a.tags) - getCarouselIndex(b.tags));
    
    const firstItem = items[0];
    const metrics = typeof firstItem.metrics === 'string' 
      ? JSON.parse(firstItem.metrics) 
      : firstItem.metrics;
    
    // Combine all visual analyses
    const combinedAnalysis = {
      visualElements: [] as string[],
      colorScheme: [] as string[],
      emotionAppeal: [] as string[],
      productPresentation: [] as string[],
      successFactors: [] as string[],
      failureFactors: [] as string[],
      improvementSuggestions: [] as string[],
    };
    
    items.forEach(item => {
      const va = item.vision_analysis;
      if (va) {
        if (va.visual_elements) combinedAnalysis.visualElements.push(...va.visual_elements);
        if (va.color_scheme) combinedAnalysis.colorScheme.push(...va.color_scheme);
        if (va.emotion_appeal) combinedAnalysis.emotionAppeal.push(va.emotion_appeal);
        if (va.product_presentation) combinedAnalysis.productPresentation.push(va.product_presentation);
      }
      if (item.success_factors) combinedAnalysis.successFactors.push(...item.success_factors);
      if (item.failure_factors) combinedAnalysis.failureFactors.push(...item.failure_factors);
      if (item.improvement_suggestions) combinedAnalysis.improvementSuggestions.push(...item.improvement_suggestions);
    });
    
    // Dedupe arrays
    combinedAnalysis.visualElements = [...new Set(combinedAnalysis.visualElements)];
    combinedAnalysis.colorScheme = [...new Set(combinedAnalysis.colorScheme)];
    combinedAnalysis.emotionAppeal = [...new Set(combinedAnalysis.emotionAppeal)];
    combinedAnalysis.productPresentation = [...new Set(combinedAnalysis.productPresentation)];
    combinedAnalysis.successFactors = [...new Set(combinedAnalysis.successFactors)];
    combinedAnalysis.failureFactors = [...new Set(combinedAnalysis.failureFactors)];
    combinedAnalysis.improvementSuggestions = [...new Set(combinedAnalysis.improvementSuggestions)];
    
    return {
      originalAdId,
      adName: getCleanAdName(firstItem.creative_name),
      campaignName: firstItem.campaign_name || '',
      metrics: {
        spend: metrics?.spend || 0,
        roas: metrics?.roas || 0,
        ctr: metrics?.ctr || 0,
        cvr: metrics?.cvr || 0,
        impressions: metrics?.impressions || 0,
        clicks: metrics?.clicks || 0,
        purchases: metrics?.purchases || 0,
      },
      performanceTier: firstItem.performance_tier || 'medium',
      images: items.map((item, idx) => ({
        url: item.thumbnail_url || item.image_url || '',
        index: getCarouselIndex(item.tags),
        visionAnalysis: item.vision_analysis,
      })).filter(img => img.url),
      combinedAnalysis,
    };
  });
};

// Metric Card Component
const MetricBadge = memo(function MetricBadge({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
});

// Grouped Ad Card Component
interface GroupedAdCardProps {
  groupedAd: GroupedAd;
  index: number;
  onSelect: () => void;
}

const GroupedAdCard = memo(function GroupedAdCard({
  groupedAd,
  index,
  onSelect,
}: GroupedAdCardProps) {
  const tierConfig = TIER_CONFIG[groupedAd.performanceTier] || TIER_CONFIG.medium;
  const hasAnalysis = groupedAd.combinedAnalysis.visualElements.length > 0 || 
                      groupedAd.combinedAnalysis.emotionAppeal.length > 0;
  
  // Generate AI summary
  const aiSummary = useMemo(() => {
    const parts: string[] = [];
    if (groupedAd.combinedAnalysis.emotionAppeal.length > 0) {
      parts.push(groupedAd.combinedAnalysis.emotionAppeal[0]);
    }
    if (groupedAd.combinedAnalysis.colorScheme.length > 0) {
      parts.push(`主色調：${groupedAd.combinedAnalysis.colorScheme.slice(0, 3).join('、')}`);
    }
    if (groupedAd.combinedAnalysis.productPresentation.length > 0) {
      parts.push(groupedAd.combinedAnalysis.productPresentation[0]);
    }
    return parts.join('。') || null;
  }, [groupedAd.combinedAnalysis]);

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group",
        tierConfig.border,
        "hover:border-indigo-400"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-xs font-bold text-white">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : `#${index + 1}`}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                🎯 {groupedAd.adName}
              </h3>
              <p className="text-[10px] text-gray-500">{groupedAd.campaignName}</p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0",
            tierConfig.bg, tierConfig.text
          )}>
            {tierConfig.label}
          </span>
        </div>
        
        {/* Metrics Row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <MetricBadge 
            icon={DollarSign} 
            label="花費" 
            value={`$${groupedAd.metrics.spend.toLocaleString()}`}
            color="text-emerald-500"
          />
          <MetricBadge 
            icon={TrendingUp} 
            label="ROAS" 
            value={groupedAd.metrics.roas.toFixed(2)}
            color="text-blue-500"
          />
          <MetricBadge 
            icon={MousePointer} 
            label="CTR" 
            value={`${groupedAd.metrics.ctr.toFixed(2)}%`}
            color="text-purple-500"
          />
          <MetricBadge 
            icon={ShoppingCart} 
            label="CVR" 
            value={`${groupedAd.metrics.cvr.toFixed(2)}%`}
            color="text-orange-500"
          />
        </div>
      </div>
      
      {/* Carousel Images */}
      <div className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {groupedAd.images.map((img, imgIdx) => (
            <div 
              key={imgIdx}
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-indigo-300 transition-colors relative"
            >
              <img
                src={img.url}
                alt={`輪播圖 ${imgIdx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">
                {imgIdx + 1}/{groupedAd.images.length}
              </div>
            </div>
          ))}
        </div>
        
        {/* AI Summary */}
        {aiSummary && (
          <div className="mt-3 p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-indigo-600 mb-0.5">💡 AI 分析</p>
                <p className="text-xs text-gray-700 line-clamp-2">{aiSummary}</p>
              </div>
            </div>
          </div>
        )}
        
        {!hasAnalysis && (
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
            <p className="text-[10px] text-gray-400">點擊查看詳細分析</p>
          </div>
        )}
      </div>
    </div>
  );
});

// Main Component
const CreativeAnalysis = memo(function CreativeAnalysis({ 
  creatives, 
  isLoading = false 
}: CreativeAnalysisProps) {
  const [selectedGroupedAd, setSelectedGroupedAd] = useState<GroupedAd | null>(null);
  
  // Group creatives by original_ad_id
  const groupedAds = useMemo(() => {
    const groups = groupCreativesByAd(creatives);
    // Sort by spend (highest first)
    return groups.sort((a, b) => b.metrics.spend - a.metrics.spend);
  }, [creatives]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (groupedAds.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">廣告素材分析</h2>
            <p className="text-xs text-gray-500">本週廣告素材表現</p>
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
                📊 廣告素材分析
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                共 {groupedAds.length} 組廣告 • {creatives.length} 張素材
              </p>
            </div>
          </div>
          <span className="badge badge-pink text-[10px] sm:text-xs">
            AI 分析
          </span>
        </div>

        {/* Grouped Ad Cards */}
        <div className="space-y-4">
          {groupedAds.map((groupedAd, index) => (
            <GroupedAdCard
              key={groupedAd.originalAdId}
              groupedAd={groupedAd}
              index={index}
              onSelect={() => setSelectedGroupedAd(groupedAd)}
            />
          ))}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedGroupedAd && (
        <GroupedAdDetailModal 
          groupedAd={selectedGroupedAd} 
          onClose={() => setSelectedGroupedAd(null)} 
        />
      )}
    </>
  );
});

// Grouped Ad Detail Modal Component
interface GroupedAdDetailModalProps {
  groupedAd: GroupedAd;
  onClose: () => void;
}

const GroupedAdDetailModal = memo(function GroupedAdDetailModal({ 
  groupedAd, 
  onClose 
}: GroupedAdDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const tierConfig = TIER_CONFIG[groupedAd.performanceTier] || TIER_CONFIG.medium;

  const goToPrevImage = () => {
    setCurrentImageIndex(prev => prev === 0 ? groupedAd.images.length - 1 : prev - 1);
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => prev === groupedAd.images.length - 1 ? 0 : prev + 1);
  };

  const currentVisionAnalysis = groupedAd.images[currentImageIndex]?.visionAnalysis;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                🎯 {groupedAd.adName}
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  tierConfig.bg, tierConfig.text
                )}>
                  {tierConfig.label}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {groupedAd.campaignName} • {groupedAd.images.length} 張輪播圖
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">${groupedAd.metrics.spend.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">花費</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{groupedAd.metrics.roas.toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">ROAS</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-600">{groupedAd.metrics.ctr.toFixed(2)}%</p>
              <p className="text-[10px] text-gray-500">CTR</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{groupedAd.metrics.cvr.toFixed(2)}%</p>
              <p className="text-[10px] text-gray-500">CVR</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Carousel */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              {groupedAd.images.length > 0 ? (
                <>
                  <img
                    src={groupedAd.images[currentImageIndex]?.url}
                    alt={`${groupedAd.adName} - 輪播圖 ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {groupedAd.images.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        aria-label="上一張"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                      </button>
                      <button
                        onClick={goToNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        aria-label="下一張"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-sm text-white font-medium">
                    {currentImageIndex + 1} / {groupedAd.images.length}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {groupedAd.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {groupedAd.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIndex 
                        ? "border-indigo-500 ring-2 ring-indigo-200" 
                        : "border-transparent hover:border-gray-300"
                    )}
                  >
                    <img
                      src={img.url}
                      alt={`縮圖 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Current Image Vision Analysis */}
            {currentVisionAnalysis && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" />
                  圖 {currentImageIndex + 1} 分析
                </p>
                <div className="space-y-2 text-xs text-gray-600">
                  {currentVisionAnalysis.composition && (
                    <p><span className="font-medium">構圖：</span>{currentVisionAnalysis.composition}</p>
                  )}
                  {currentVisionAnalysis.emotion_appeal && (
                    <p><span className="font-medium">情感訴求：</span>{currentVisionAnalysis.emotion_appeal}</p>
                  )}
                  {currentVisionAnalysis.product_presentation && (
                    <p><span className="font-medium">產品呈現：</span>{currentVisionAnalysis.product_presentation}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Section */}
          <div className="space-y-4">
            {/* Combined Visual Analysis */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
              <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                整體視覺分析
              </p>
              <div className="space-y-3">
                {/* Color Scheme */}
                {groupedAd.combinedAnalysis.colorScheme.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Palette className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-500 block">主色調</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {groupedAd.combinedAnalysis.colorScheme.slice(0, 6).map((color, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Emotion Appeal */}
                {groupedAd.combinedAnalysis.emotionAppeal.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Type className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-500 block">情感訴求</span>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {groupedAd.combinedAnalysis.emotionAppeal.join('、')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual Elements Summary */}
                {groupedAd.combinedAnalysis.visualElements.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Layout className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-500 block">視覺元素</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {groupedAd.combinedAnalysis.visualElements.slice(0, 8).map((elem, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">
                            {elem}
                          </span>
                        ))}
                        {groupedAd.combinedAnalysis.visualElements.length > 8 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                            +{groupedAd.combinedAnalysis.visualElements.length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Success Factors */}
            {groupedAd.combinedAnalysis.successFactors.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <span className="text-emerald-500">✅</span> 成功因素
                </p>
                <ul className="space-y-1.5">
                  {groupedAd.combinedAnalysis.successFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failure Factors */}
            {groupedAd.combinedAnalysis.failureFactors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> 待改善
                </p>
                <ul className="space-y-1.5">
                  {groupedAd.combinedAnalysis.failureFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement Suggestions */}
            {groupedAd.combinedAnalysis.improvementSuggestions.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> 優化建議
                </p>
                <ul className="space-y-1.5">
                  {groupedAd.combinedAnalysis.improvementSuggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No Analysis Available */}
            {groupedAd.combinedAnalysis.visualElements.length === 0 && 
             groupedAd.combinedAnalysis.emotionAppeal.length === 0 &&
             groupedAd.combinedAnalysis.successFactors.length === 0 && 
             groupedAd.combinedAnalysis.failureFactors.length === 0 && 
             groupedAd.combinedAnalysis.improvementSuggestions.length === 0 && (
              <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">尚無 AI 分析數據</p>
                <p className="text-xs mt-1">分析將於資料同步後自動產生</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CreativeAnalysis;
