'use client';

import { memo, useMemo } from 'react';
import { Target, MapPin, Users, Heart, UserCheck, UserX, Sparkles, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

// Targeting 資料結構
interface TargetingData {
  age_min?: number;
  age_max?: number;
  genders?: number[];  // 1=male, 2=female
  geo_locations?: {
    countries?: string[];
    cities?: { key: string; name: string }[];
    regions?: { key: string; name: string }[];
  };
  interests?: { id: string; name: string }[];
  custom_audiences?: { id: string; name: string }[];
  excluded_custom_audiences?: { id: string; name: string }[];
}

interface AdsetData {
  id: string;
  adset_id: string;
  adset_name: string;
  campaign_name?: string;
  targeting: TargetingData;
  spend?: number;
  roas?: number;
}

interface TargetingAnalysisProps {
  adsets?: AdsetData[];
  isLoading?: boolean;
}

// 將 gender code 轉換成中文
const genderMap: Record<number, string> = {
  1: '男性',
  2: '女性',
};

// Mock 數據（當沒有真實資料時使用）
const mockAdsets: AdsetData[] = [
  {
    id: '1',
    adset_id: '23850001',
    adset_name: '汽車愛好者-25-55歲',
    campaign_name: '251218_LM香氛磚',
    targeting: {
      age_min: 25,
      age_max: 55,
      genders: [1, 2],
      geo_locations: {
        countries: ['TW'],
        cities: [{ key: '2306179', name: '台北' }, { key: '2306180', name: '新北' }],
      },
      interests: [
        { id: '6003139266461', name: '汽車' },
        { id: '6003107902433', name: '汽車改裝' },
        { id: '6003397425735', name: 'BMW' },
      ],
      custom_audiences: [
        { id: '23849012345', name: '網站訪客-30天' },
      ],
      excluded_custom_audiences: [
        { id: '23849012347', name: '已購買7天' },
      ],
    },
    spend: 15000,
    roas: 3.2,
  },
  {
    id: '2',
    adset_id: '23850002',
    adset_name: 'Lookalike-購買客戶',
    campaign_name: '250115_通用導流',
    targeting: {
      age_min: 20,
      age_max: 65,
      genders: [1],
      geo_locations: {
        countries: ['TW'],
      },
      interests: [],
      custom_audiences: [
        { id: '23849012348', name: 'Lookalike-購買客戶1%' },
      ],
    },
    spend: 8500,
    roas: 4.1,
  },
];

// AI 分析生成器（基於受眾設定與 ROAS）
function generateAIAnalysis(adsets: AdsetData[]) {
  if (adsets.length === 0) return null;
  
  const analyses = adsets.map((adset, index) => {
    const t = adset.targeting;
    const pros: string[] = [];
    const cons: string[] = [];
    
    // 年齡範圍分析
    const ageRange = (t.age_max || 65) - (t.age_min || 18);
    if (ageRange > 30) {
      pros.push('受眾年齡範圍廣，覆蓋面大');
      cons.push('年齡跨度大，可能造成訊息傳遞不精準');
    } else if (ageRange <= 20) {
      pros.push('年齡區間精準，訊息溝通更聚焦');
      cons.push('受眾池較小，可能限制曝光規模');
    }
    
    // 性別分析
    if (t.genders?.length === 2) {
      pros.push('涵蓋男女雙性別，潛在受眾更廣');
    } else if (t.genders?.length === 1) {
      const gender = t.genders[0] === 1 ? '男性' : '女性';
      pros.push(`鎖定${gender}，受眾明確`);
      cons.push(`僅投放${gender}，可能錯過其他性別的潛在客戶`);
    }
    
    // 興趣標籤分析
    if (t.interests && t.interests.length > 0) {
      pros.push(`使用 ${t.interests.length} 個興趣標籤精準定位`);
      if (t.interests.length > 5) {
        cons.push('興趣標籤過多可能稀釋受眾精準度');
      }
    } else {
      cons.push('未設定興趣標籤，可能無法精準觸及目標客群');
    }
    
    // Lookalike 分析
    const hasLookalike = t.custom_audiences?.some(a => 
      a.name.toLowerCase().includes('lookalike') || a.name.includes('類似')
    );
    if (hasLookalike) {
      pros.push('使用 Lookalike 受眾，精準度高');
      pros.push('基於真實購買數據建模');
    }
    
    // 網站訪客再行銷
    const hasRetargeting = t.custom_audiences?.some(a => 
      a.name.includes('訪客') || a.name.includes('retargeting')
    );
    if (hasRetargeting) {
      pros.push('包含網站訪客再行銷，轉換率通常較高');
    }
    
    // 排除受眾
    if (t.excluded_custom_audiences && t.excluded_custom_audiences.length > 0) {
      pros.push('設定排除受眾，避免廣告疲勞');
    } else {
      cons.push('未設定排除受眾，可能重複投放給已購買客戶');
    }
    
    // ROAS 分析
    if (adset.roas) {
      if (adset.roas >= 4) {
        pros.push(`ROAS 達 ${adset.roas.toFixed(2)}，表現優異`);
      } else if (adset.roas >= 3) {
        pros.push(`ROAS ${adset.roas.toFixed(2)}，表現良好`);
      } else if (adset.roas < 2) {
        cons.push(`ROAS 僅 ${adset.roas.toFixed(2)}，需要優化`);
      }
    }
    
    return {
      adsetName: adset.adset_name,
      campaignName: adset.campaign_name,
      pros,
      cons,
      roas: adset.roas,
    };
  });
  
  // 生成建議
  const suggestions: string[] = [];
  const highestRoasAdset = adsets.reduce((a, b) => 
    (b.roas || 0) > (a.roas || 0) ? b : a
  );
  
  if (highestRoasAdset.targeting.custom_audiences?.some(a => 
    a.name.toLowerCase().includes('lookalike')
  )) {
    suggestions.push('Lookalike 受眾表現最佳，建議其他廣告組也測試加入 Lookalike 受眾');
  }
  
  if (adsets.some(a => !a.targeting.excluded_custom_audiences?.length)) {
    suggestions.push('建議所有廣告組都設定「已購買」排除受眾，避免廣告浪費');
  }
  
  const ageRanges = adsets.map(a => ({
    name: a.adset_name,
    range: (a.targeting.age_max || 65) - (a.targeting.age_min || 18),
    roas: a.roas || 0,
  }));
  const narrowAgeHighRoas = ageRanges.find(a => a.range <= 25 && a.roas >= 3);
  if (narrowAgeHighRoas) {
    suggestions.push(`「${narrowAgeHighRoas.name}」年齡範圍較窄但 ROAS 高，建議其他組也嘗試縮小年齡區間`);
  }
  
  if (suggestions.length === 0) {
    suggestions.push('持續監控各廣告組表現，定期進行 A/B 測試優化受眾設定');
  }
  
  return { analyses, suggestions };
}

// 單個廣告組受眾卡片
const AdsetTargetingCard = memo(function AdsetTargetingCard({ 
  adset, 
  index 
}: { 
  adset: AdsetData; 
  index: number;
}) {
  const t = adset.targeting;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colors = [
    { bg: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/30', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30', badge: 'bg-emerald-100 text-emerald-700' },
    { bg: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30', badge: 'bg-amber-100 text-amber-700' },
    { bg: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/30', badge: 'bg-pink-100 text-pink-700' },
    { bg: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30', badge: 'bg-violet-100 text-violet-700' },
    { bg: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30', badge: 'bg-cyan-100 text-cyan-700' },
  ];
  const color = colors[index % colors.length];
  
  // 地區顯示
  const locations = [
    ...(t.geo_locations?.countries || []),
    ...(t.geo_locations?.cities?.map(c => c.name) || []),
    ...(t.geo_locations?.regions?.map(r => r.name) || []),
  ];
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${color.bg} p-4 ${color.shadow}`}>
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
          {adset.roas && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              adset.roas >= 3 ? 'bg-white/90 text-emerald-600' : 'bg-white/90 text-amber-600'
            }`}>
              ROAS {adset.roas.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4 flex-1">
        {/* 年齡 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">年齡範圍</p>
            <p className="text-sm font-semibold text-gray-900">
              {t.age_min && t.age_max ? `${t.age_min} - ${t.age_max} 歲` : '不限'}
            </p>
          </div>
        </div>
        
        {/* 性別 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-pink-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">性別</p>
            <p className="text-sm font-semibold text-gray-900">
              {t.genders?.length 
                ? t.genders.map(g => genderMap[g]).join(' / ') 
                : '不限'}
            </p>
          </div>
        </div>
        
        {/* 地區 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">投放地區</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {locations.length > 0 ? locations.map((loc, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-50 rounded text-xs font-medium text-emerald-700">
                  {loc}
                </span>
              )) : (
                <span className="text-sm text-gray-500">不限</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 興趣標籤 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🎯</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium">興趣標籤</p>
            {t.interests && t.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {t.interests.map((interest, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-50 rounded text-xs font-medium text-amber-700">
                    {interest.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">無</p>
            )}
          </div>
        </div>
        
        {/* 自訂受眾 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium">自訂受眾</p>
            {t.custom_audiences && t.custom_audiences.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {t.custom_audiences.map((aud, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 rounded text-xs font-medium text-indigo-700">
                    ✓ {aud.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">無</p>
            )}
          </div>
        </div>
        
        {/* 排除受眾 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium">排除受眾</p>
            {t.excluded_custom_audiences && t.excluded_custom_audiences.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {t.excluded_custom_audiences.map((aud, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-50 rounded text-xs font-medium text-red-600">
                    ✗ {aud.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">無</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer - 花費資訊 */}
      {adset.spend && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">總花費</span>
            <span className="font-bold text-gray-900 font-mono-nums">
              NT${adset.spend.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

const TargetingAnalysis = memo(function TargetingAnalysis({ 
  adsets: propAdsets, 
  isLoading = false 
}: TargetingAnalysisProps) {
  const adsets = propAdsets?.length ? propAdsets : mockAdsets;
  
  // 生成 AI 分析
  const aiAnalysis = useMemo(() => generateAIAnalysis(adsets), [adsets]);

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
            <p className="text-xs text-gray-500 mt-0.5">並排比較不同廣告組的受眾設定</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
          {adsets.length} 組廣告組
        </span>
      </div>

      {/* 並排比較區 */}
      <div className={`grid gap-4 mb-6 ${
        adsets.length === 1 ? 'grid-cols-1' :
        adsets.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        adsets.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {adsets.map((adset, index) => (
          <AdsetTargetingCard key={adset.id} adset={adset} index={index} />
        ))}
      </div>

      {/* AI 分析區塊 */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {/* AI 分析 Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 className="text-white font-semibold">💡 AI 受眾分析</h3>
          </div>
          
          <div className="p-5 space-y-5">
            {/* 各廣告組分析 */}
            {aiAnalysis.analyses.map((analysis, index) => {
              const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
              return (
                <div key={index} className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-gray-800 text-white flex items-center justify-center text-sm font-bold">
                      {letters[index]}
                    </span>
                    {analysis.adsetName}
                    {analysis.roas && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        analysis.roas >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        analysis.roas >= 3 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        ROAS {analysis.roas.toFixed(2)}
                      </span>
                    )}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                    {/* 優點 */}
                    {analysis.pros.length > 0 && (
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">優點</span>
                        </div>
                        <ul className="space-y-1">
                          {analysis.pros.map((pro, i) => (
                            <li key={i} className="text-sm text-emerald-800 flex items-start gap-1.5">
                              <span className="text-emerald-500 mt-0.5">✓</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* 缺點 */}
                    {analysis.cons.length > 0 && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingDown className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-700">待改進</span>
                        </div>
                        <ul className="space-y-1">
                          {analysis.cons.map((con, i) => (
                            <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">⚠</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* 建議區塊 */}
            {aiAnalysis.suggestions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">優化建議</span>
                </div>
                <ul className="space-y-2">
                  {aiAnalysis.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-blue-900 flex items-start gap-2">
                      <span className="text-blue-500 font-bold">{i + 1}.</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
});

export default TargetingAnalysis;
