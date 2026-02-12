'use client';

import { memo, useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Lightbulb, Sparkles, AlertCircle, CheckCircle, Users, DollarSign, ShoppingCart, MousePointer } from 'lucide-react';
import { useTargetingData, type AdsetWithTargeting } from '@/lib/useTargetingData';
import { useAdMetrics, type AdMetrics } from '@/contexts/AdMetricsContext';

interface TargetingAnalysisProps {
  isLoading?: boolean;
  weekStart?: string;  // YYYY-MM-DD format for filtering by week
}

// 評分顏色配置
const getScoreConfig = (score: number) => {
  if (score >= 7) return { bg: 'bg-emerald-500', text: 'text-emerald-700', label: '優良', color: 'emerald' };
  if (score >= 5) return { bg: 'bg-amber-500', text: 'text-amber-700', label: '可接受', color: 'amber' };
  return { bg: 'bg-red-500', text: 'text-red-700', label: '需優化', color: 'red' };
};

// 單個廣告組受眾卡片
const AdsetTargetingCard = memo(function AdsetTargetingCard({ 
  adset, 
  index 
}: { 
  adset: AdsetWithTargeting; 
  index: number;
}) {
  const t = adset.targeting;
  const scoreConfig = getScoreConfig(t.score);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colors = [
    { bg: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/30' },
    { bg: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
    { bg: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30' },
    { bg: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/30' },
    { bg: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30' },
    { bg: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
  ];
  const color = colors[index % colors.length];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className={`bg-gradient-to-r ${color.bg} p-4 ${color.shadow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              {letters[index]}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate" title={adset.adset_name}>
                {adset.adset_name}
              </h3>
              {adset.campaign_name && (
                <p className="text-white/70 text-xs truncate" title={adset.campaign_name}>
                  {adset.campaign_name}
                </p>
              )}
            </div>
          </div>
          {/* 受眾評分 */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full ${scoreConfig.bg} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
              {t.score.toFixed(1)}
            </div>
            <span className="text-white/80 text-[10px] mt-1">{scoreConfig.label}</span>
          </div>
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-around">
        {adset.spend !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <DollarSign className="w-3 h-3" />
              <span className="text-[10px]">花費</span>
            </div>
            <p className="font-semibold text-gray-900">NT${adset.spend.toLocaleString()}</p>
          </div>
        )}
        {adset.roas !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px]">ROAS</span>
            </div>
            <p className={`font-semibold ${adset.roas >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
              {adset.roas.toFixed(2)}
            </p>
          </div>
        )}
        {adset.purchases !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <ShoppingCart className="w-3 h-3" />
              <span className="text-[10px]">購買</span>
            </div>
            <p className="font-semibold text-gray-900">{adset.purchases}</p>
          </div>
        )}
        {adset.ctr !== undefined && adset.ctr > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <MousePointer className="w-3 h-3" />
              <span className="text-[10px]">CTR</span>
            </div>
            <p className="font-semibold text-purple-600">{adset.ctr.toFixed(2)}%</p>
          </div>
        )}
        {adset.cvr !== undefined && adset.cvr > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px]">CVR</span>
            </div>
            <p className="font-semibold text-orange-600">{adset.cvr.toFixed(2)}%</p>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4 flex-1">
        {/* 優點 */}
        {t.strengths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">優點</span>
            </div>
            <ul className="space-y-1 pl-5">
              {t.strengths.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 待改善 */}
        {t.weaknesses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">待改善</span>
            </div>
            <ul className="space-y-1 pl-5">
              {t.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 建議 */}
        {t.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-700">優化建議</span>
            </div>
            <ul className="space-y-1 pl-5">
              {t.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Assessment Details (Collapsible) */}
      {(t.age_assessment || t.gender_assessment || t.interest_assessment || t.custom_audience_assessment) && (
        <details className="border-t border-gray-100">
          <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
            📋 詳細評估
          </summary>
          <div className="px-4 pb-4 space-y-2 text-xs text-gray-600">
            {t.age_assessment && (
              <div>
                <span className="font-medium text-gray-700">年齡：</span>
                {t.age_assessment}
              </div>
            )}
            {t.gender_assessment && (
              <div>
                <span className="font-medium text-gray-700">性別：</span>
                {t.gender_assessment}
              </div>
            )}
            {t.interest_assessment && (
              <div>
                <span className="font-medium text-gray-700">興趣：</span>
                {t.interest_assessment}
              </div>
            )}
            {t.custom_audience_assessment && (
              <div>
                <span className="font-medium text-gray-700">自訂受眾：</span>
                {t.custom_audience_assessment}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
});

// 比較摘要區塊
const ComparisonSummary = memo(function ComparisonSummary({ 
  adsets 
}: { 
  adsets: AdsetWithTargeting[];
}) {
  if (adsets.length < 2) return null;
  
  // 找出最佳受眾設定
  const bestAdset = adsets.reduce((a, b) => 
    b.targeting.score > a.targeting.score ? b : a
  );
  
  // 找出最高 ROAS
  const bestRoas = adsets.reduce((a, b) => 
    (b.roas || 0) > (a.roas || 0) ? b : a
  );

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-indigo-800">📊 比較摘要</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="bg-white/60 rounded-lg p-3">
          <span className="text-gray-500">最佳受眾設定：</span>
          <p className="font-semibold text-indigo-700">
            {bestAdset.adset_name} ({bestAdset.targeting.score}/10)
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <span className="text-gray-500">最高 ROAS：</span>
          <p className="font-semibold text-emerald-700">
            {bestRoas.adset_name} ({bestRoas.roas?.toFixed(2) || 'N/A'})
          </p>
        </div>
      </div>
      
      {/* 關鍵洞察 */}
      <div className="mt-4 pt-3 border-t border-indigo-200">
        <p className="text-xs text-indigo-700 font-medium mb-2">💡 關鍵洞察</p>
        <ul className="space-y-1 text-xs text-gray-600">
          {bestAdset.targeting.score >= 7 && (
            <li>• 「{bestAdset.adset_name}」受眾設定較完善，可作為其他組的參考基準</li>
          )}
          {adsets.some(a => a.roas && a.roas < 1) && (
            <li>• 有廣告組 ROAS 低於 1，需要優化受眾或素材以提高轉換</li>
          )}
          {adsets.every(a => a.targeting.weaknesses.some(w => w.includes('年齡'))) && (
            <li>• 所有廣告組的年齡設定都過廣，建議統一縮窄至核心族群</li>
          )}
        </ul>
      </div>
    </div>
  );
});

const TargetingAnalysis = memo(function TargetingAnalysis({ 
  isLoading: propIsLoading = false,
  weekStart 
}: TargetingAnalysisProps) {
  const { adsets, isLoading: dataLoading, error } = useTargetingData(weekStart);
  const { getAllMetrics, isLoading: metricsLoading } = useAdMetrics();
  
  // 從統一 AdMetrics Context 獲取所有廣告成效
  const allMetrics = useMemo(() => getAllMetrics(), [getAllMetrics]);
  
  // 將 adsets 與統一的 metrics 合併
  // 嘗試根據名稱匹配（因為 adset 和 ad 可能有相似的名稱）
  const enrichedAdsets = useMemo<AdsetWithTargeting[]>(() => {
    if (allMetrics.length === 0) return adsets;
    
    return adsets.map(adset => {
      // 嘗試找到對應的 ad metrics
      // 優先通過 campaign_name 匹配，然後通過名稱相似度
      let matchedMetrics: AdMetrics | undefined;
      
      // 1. 嘗試通過 campaign_name 精確匹配
      if (adset.campaign_name) {
        matchedMetrics = allMetrics.find(m => 
          m.campaignName === adset.campaign_name
        );
      }
      
      // 2. 如果沒有匹配，嘗試通過名稱模糊匹配
      if (!matchedMetrics) {
        const adsetNameLower = adset.adset_name.toLowerCase();
        matchedMetrics = allMetrics.find(m => {
          const adNameLower = m.adName.toLowerCase();
          // 檢查是否有部分匹配
          return adNameLower.includes(adsetNameLower) || 
                 adsetNameLower.includes(adNameLower) ||
                 // 或者檢查關鍵詞匹配
                 adsetNameLower.split(/\s+/).some(word => 
                   word.length > 3 && adNameLower.includes(word)
                 );
        });
      }
      
      // 如果找到匹配的 metrics，使用統一數據
      if (matchedMetrics) {
        return {
          ...adset,
          spend: matchedMetrics.spend,
          impressions: matchedMetrics.impressions,
          clicks: matchedMetrics.clicks,
          purchases: matchedMetrics.purchases,
          roas: matchedMetrics.roas,
          ctr: matchedMetrics.ctr,
          cvr: matchedMetrics.cvr,
        };
      }
      
      return adset;
    });
  }, [adsets, allMetrics]);
  
  const isLoading = propIsLoading || dataLoading || metricsLoading;

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">📊 廣告受眾分析</h2>
        </div>
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
          <p>載入資料時發生錯誤</p>
          <p className="text-xs mt-1 text-gray-500">{error}</p>
        </div>
      </section>
    );
  }

  if (enrichedAdsets.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">📊 廣告受眾分析</h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>尚無廣告組受眾數據</p>
          <p className="text-xs mt-1">請在 Supabase 的 meta_adsets 表新增資料</p>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="targeting-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="targeting-title" className="text-lg font-semibold text-gray-900">
              📊 廣告受眾分析
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">🦀 螃蟹 AI 分析 • 比較不同廣告組的受眾設定</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
          {enrichedAdsets.length} 組廣告組
        </span>
      </div>

      {/* 比較摘要 */}
      <ComparisonSummary adsets={enrichedAdsets} />

      {/* 並排比較區 */}
      <div className={`grid gap-4 ${
        enrichedAdsets.length === 1 ? 'grid-cols-1' :
        enrichedAdsets.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        enrichedAdsets.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {enrichedAdsets.map((adset, index) => (
          <AdsetTargetingCard key={adset.id} adset={adset} index={index} />
        ))}
      </div>
    </section>
  );
});

export default TargetingAnalysis;
