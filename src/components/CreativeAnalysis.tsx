'use client';

import { memo, useState, useMemo } from 'react';
import { Image, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, Lightbulb, Palette, Type, Layout, TrendingUp, DollarSign, MousePointer, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdMetrics } from '@/contexts/AdMetricsContext';

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
    conversions?: number;
    conv_value?: number;
    cvr?: number;
  };
  performance_tier: 'high' | 'medium' | 'low' | null;
  performance_rank: number | null;
  vision_analysis: {
    // 資料庫實際欄位
    strengths?: string[];
    weaknesses?: string[];
    color_scheme?: string[];
    brand_consistency?: string | null;
    composition_score?: number | null;
    cta_effectiveness?: string | null;
    attractiveness_score?: number | null;
    improvement_suggestions?: string[];
    // 備用欄位（相容舊版）
    dominant_colors?: string[];
    detected_objects?: string[];
    text_detected?: string;
    composition?: string;
    visual_elements?: string[];
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
        // 優先讀取資料庫實際欄位 (strengths/weaknesses)
        if (va.strengths && va.strengths.length > 0) {
          combinedAnalysis.successFactors.push(...va.strengths);
        }
        if (va.weaknesses && va.weaknesses.length > 0) {
          combinedAnalysis.failureFactors.push(...va.weaknesses);
        }
        if (va.improvement_suggestions && va.improvement_suggestions.length > 0) {
          combinedAnalysis.improvementSuggestions.push(...va.improvement_suggestions);
        }
        // 相容舊版欄位
        if (va.visual_elements) combinedAnalysis.visualElements.push(...va.visual_elements);
        if (va.color_scheme) combinedAnalysis.colorScheme.push(...va.color_scheme);
        if (va.emotion_appeal) combinedAnalysis.emotionAppeal.push(va.emotion_appeal);
        if (va.product_presentation) combinedAnalysis.productPresentation.push(va.product_presentation);
      }
      // 頂層欄位（舊版相容）
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
    
    // Calculate CVR from conversions/purchases and clicks (since metrics.cvr might be 0)
    const clicks = metrics?.clicks || 0;
    const conversions = metrics?.conversions ?? metrics?.purchases ?? 0;
    const calculatedCvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
    
    // Build images array - combine image_url and carousel_images
    let images: GroupedAd['images'] = [];
    
    // First, add the main image_url if it exists
    if (firstItem.image_url) {
      images.push({
        url: firstItem.image_url,
        index: 0,
        visionAnalysis: firstItem.vision_analysis,
      });
    }
    
    // Then add carousel_images (if any) - these are the additional carousel slides
    const carouselImages = firstItem.carousel_images || [];
    if (carouselImages.length > 0) {
      // If we already have an image_url, start carousel from index 1; otherwise from 0
      const startIndex = images.length > 0 ? 1 : 0;
      carouselImages.forEach((url, idx) => {
        // Avoid duplicating if carousel[0] is same as image_url
        if (images.length === 0 || url !== firstItem.image_url) {
          images.push({
            url,
            index: startIndex + idx,
            visionAnalysis: null, // carousel images don't have individual analysis
          });
        }
      });
    }
    
    // Fallback: if still no images, try thumbnail_url
    if (images.length === 0 && firstItem.thumbnail_url) {
      images.push({
        url: firstItem.thumbnail_url,
        index: 0,
        visionAnalysis: firstItem.vision_analysis,
      });
    }
    
    return {
      originalAdId,
      adName: getCleanAdName(firstItem.creative_name),
      campaignName: firstItem.campaign_name || '',
      metrics: {
        spend: metrics?.spend || 0,
        roas: metrics?.roas || 0,
        ctr: metrics?.ctr || 0,
        cvr: calculatedCvr,  // Use calculated CVR instead of metrics.cvr
        impressions: metrics?.impressions || 0,
        clicks: clicks,
        purchases: conversions,  // Use conversions (with purchases fallback)
      },
      performanceTier: firstItem.performance_tier || 'medium',
      images,
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
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
});

// Grouped Ad Card Component with Accordion Detail
interface GroupedAdCardProps {
  groupedAd: GroupedAd;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const GroupedAdCard = memo(function GroupedAdCard({
  groupedAd,
  index,
  isExpanded,
  onToggle,
}: GroupedAdCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === 0 ? groupedAd.images.length - 1 : prev - 1);
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === groupedAd.images.length - 1 ? 0 : prev + 1);
  };

  const currentVisionAnalysis = groupedAd.images[currentImageIndex]?.visionAnalysis;

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl border-2 shadow-sm transition-all duration-300 overflow-hidden",
        tierConfig.border,
        isExpanded ? "border-indigo-400 shadow-lg" : "hover:shadow-lg hover:border-indigo-400"
      )}
    >
      {/* Clickable Header */}
      <div 
        className="cursor-pointer"
        onClick={onToggle}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : `#${index + 1}`}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base line-clamp-1">
                  🎯 {groupedAd.adName}
                </h3>
                <p className="text-xs text-gray-500">{groupedAd.campaignName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0",
                tierConfig.bg, tierConfig.text
              )}>
                {tierConfig.label}
              </span>
              {/* Expand/Collapse Indicator */}
              <div className={cn(
                "w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300",
                isExpanded && "rotate-90"
              )}>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </div>
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
        
        {/* Carousel Images Preview (collapsed view) */}
        {!isExpanded && (
          <div className="p-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {groupedAd.images.map((img, imgIdx) => (
                <div 
                  key={imgIdx}
                  className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-indigo-300 transition-colors relative"
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
                    <p className="text-xs font-medium text-indigo-600 mb-0.5">💡 AI 分析</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{aiSummary}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!hasAnalysis && (
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">點擊展開詳細分析</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Detail Section (Accordion) */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-4 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
          {/* Image Carousel */}
          <div className="space-y-3 mb-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 max-w-sm mx-auto">
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
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                    {currentImageIndex + 1} / {groupedAd.images.length}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {groupedAd.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {groupedAd.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
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
          </div>

          {/* Analysis Content */}
          <div className="space-y-3">
            {/* Current Image Vision Analysis */}
            {currentVisionAnalysis && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" />
                  圖 {currentImageIndex + 1} 分析
                </p>
                <div className="space-y-1.5 text-sm text-gray-600">
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

            {/* Combined Visual Analysis */}
            {(groupedAd.combinedAnalysis.colorScheme.length > 0 || 
              groupedAd.combinedAnalysis.emotionAppeal.length > 0 ||
              groupedAd.combinedAnalysis.visualElements.length > 0) && (
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <p className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  整體視覺分析
                </p>
                <div className="space-y-2">
                  {/* Color Scheme */}
                  {groupedAd.combinedAnalysis.colorScheme.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Palette className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500 block">主色調</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {groupedAd.combinedAnalysis.colorScheme.slice(0, 4).map((color, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
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
                      <Type className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
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
                      <Layout className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500 block">視覺元素</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {groupedAd.combinedAnalysis.visualElements.slice(0, 6).map((elem, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                              {elem}
                            </span>
                          ))}
                          {groupedAd.combinedAnalysis.visualElements.length > 6 && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                              +{groupedAd.combinedAnalysis.visualElements.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success Factors */}
            {groupedAd.combinedAnalysis.successFactors.length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <span className="text-emerald-500">✅</span> 成功因素
                </p>
                <ul className="space-y-1">
                  {groupedAd.combinedAnalysis.successFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                      <ChevronRight className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failure Factors */}
            {groupedAd.combinedAnalysis.failureFactors.length > 0 && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> 待改善
                </p>
                <ul className="space-y-1">
                  {groupedAd.combinedAnalysis.failureFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                      <ChevronRight className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement Suggestions */}
            {groupedAd.combinedAnalysis.improvementSuggestions.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> 優化建議
                </p>
                <ul className="space-y-1">
                  {groupedAd.combinedAnalysis.improvementSuggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                      <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
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
              <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Sparkles className="w-6 h-6 mx-auto mb-1.5 text-gray-300" />
                <p className="text-sm">尚無 AI 分析數據</p>
                <p className="text-xs mt-0.5">分析將於資料同步後自動產生</p>
              </div>
            )}
          </div>

          {/* Collapse Button */}
          <button
            onClick={onToggle}
            className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
            收合詳細分析
          </button>
        </div>
      </div>
    </div>
  );
});

// Main Component
const CreativeAnalysis = memo(function CreativeAnalysis({ 
  creatives, 
  isLoading = false 
}: CreativeAnalysisProps) {
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);
  
  // 從統一的 AdMetrics Context 獲取數據
  const { getAdMetrics, isLoading: metricsLoading } = useAdMetrics();
  
  // Group creatives by original_ad_id and enrich with unified metrics
  const groupedAds = useMemo(() => {
    const groups = groupCreativesByAd(creatives);
    
    // Enrich each group with metrics from AdMetricsContext
    const enrichedGroups = groups.map(group => {
      // 嘗試從統一數據源獲取 metrics
      const unifiedMetrics = getAdMetrics(group.originalAdId);
      
      if (unifiedMetrics) {
        return {
          ...group,
          metrics: {
            spend: unifiedMetrics.spend,
            roas: unifiedMetrics.roas,
            ctr: unifiedMetrics.ctr,
            cvr: unifiedMetrics.cvr,
            impressions: unifiedMetrics.impressions,
            clicks: unifiedMetrics.clicks,
            purchases: unifiedMetrics.purchases,
          },
        };
      }
      
      return group;
    });
    
    // Sort by spend (highest first)
    return enrichedGroups.sort((a, b) => b.metrics.spend - a.metrics.spend);
  }, [creatives, getAdMetrics]);

  if (isLoading || metricsLoading) {
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
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                共 {groupedAds.length} 組輪播廣告 • {groupedAds.reduce((sum, ad) => sum + ad.images.length, 0)} 張素材
              </p>
            </div>
          </div>
          <span className="badge badge-pink text-xs sm:text-sm">
            AI 分析
          </span>
        </div>

        {/* Grouped Ad Cards with Accordion */}
        <div className="space-y-4">
          {groupedAds.map((groupedAd, index) => (
            <GroupedAdCard
              key={groupedAd.originalAdId}
              groupedAd={groupedAd}
              index={index}
              isExpanded={expandedAdId === groupedAd.originalAdId}
              onToggle={() => setExpandedAdId(
                expandedAdId === groupedAd.originalAdId ? null : groupedAd.originalAdId
              )}
            />
          ))}
        </div>
      </section>
    </>
  );
});

export default CreativeAnalysis;
