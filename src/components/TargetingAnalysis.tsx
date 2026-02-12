'use client';

import { memo, useMemo } from 'react';
import { Target, MapPin, Users, Heart, UserCheck, UserX } from 'lucide-react';

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

const TargetingAnalysis = memo(function TargetingAnalysis({ 
  adsets: propAdsets, 
  isLoading = false 
}: TargetingAnalysisProps) {
  const adsets = propAdsets?.length ? propAdsets : mockAdsets;

  // 彙整所有 targeting 設定
  const summary = useMemo(() => {
    const allAgeRanges: string[] = [];
    const allGenders = new Set<string>();
    const allLocations = new Set<string>();
    const allInterests = new Map<string, string>();
    const allCustomAudiences = new Map<string, string>();
    const allExcludedAudiences = new Map<string, string>();

    adsets.forEach(adset => {
      const t = adset.targeting;
      
      // 年齡
      if (t.age_min && t.age_max) {
        allAgeRanges.push(`${t.age_min}-${t.age_max}`);
      }
      
      // 性別
      t.genders?.forEach(g => {
        allGenders.add(genderMap[g] || `未知(${g})`);
      });
      
      // 地區
      t.geo_locations?.countries?.forEach(c => allLocations.add(c));
      t.geo_locations?.cities?.forEach(c => allLocations.add(c.name));
      t.geo_locations?.regions?.forEach(r => allLocations.add(r.name));
      
      // 興趣
      t.interests?.forEach(i => allInterests.set(i.id, i.name));
      
      // 自訂受眾
      t.custom_audiences?.forEach(a => allCustomAudiences.set(a.id, a.name));
      
      // 排除受眾
      t.excluded_custom_audiences?.forEach(a => allExcludedAudiences.set(a.id, a.name));
    });

    return {
      ageRanges: [...new Set(allAgeRanges)],
      genders: [...allGenders],
      locations: [...allLocations],
      interests: [...allInterests.values()],
      customAudiences: [...allCustomAudiences.values()],
      excludedAudiences: [...allExcludedAudiences.values()],
    };
  }, [adsets]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
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
              廣告受眾設定
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Meta 廣告投放目標設定</p>
          </div>
        </div>
        <span className="badge badge-purple">
          📊 {adsets.length} 組廣告組
        </span>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* 年齡範圍 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">年齡範圍</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.ageRanges.map((age, i) => (
              <span 
                key={i} 
                className="px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700 shadow-sm border border-blue-100"
              >
                {age} 歲
              </span>
            ))}
          </div>
        </div>

        {/* 性別 */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-semibold text-gray-700">性別</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.genders.map((gender, i) => (
              <span 
                key={i} 
                className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm border ${
                  gender === '男性' 
                    ? 'bg-blue-100 text-blue-700 border-blue-200' 
                    : 'bg-pink-100 text-pink-700 border-pink-200'
                }`}
              >
                {gender}
              </span>
            ))}
          </div>
        </div>

        {/* 地區 */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">投放地區</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.locations.map((loc, i) => (
              <span 
                key={i} 
                className="px-3 py-1 bg-white rounded-full text-sm font-medium text-emerald-700 shadow-sm border border-emerald-100"
              >
                📍 {loc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Interests & Audiences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 興趣標籤 */}
        {summary.interests.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-semibold text-gray-700">興趣標籤</span>
              <span className="text-xs text-gray-400">({summary.interests.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.interests.map((interest, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg text-sm font-medium text-amber-800 border border-amber-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 自訂受眾 */}
        <div className="space-y-4">
          {summary.customAudiences.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">自訂受眾</span>
                <span className="text-xs text-gray-400">({summary.customAudiences.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.customAudiences.map((aud, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-indigo-700 shadow-sm border border-indigo-100"
                  >
                    ✓ {aud}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.excludedAudiences.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-gray-700">排除受眾</span>
                <span className="text-xs text-gray-400">({summary.excludedAudiences.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.excludedAudiences.map((aud, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-red-600 shadow-sm border border-red-100"
                  >
                    ✗ {aud}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adset Details Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="廣告組受眾設定明細">
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="text-left py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">廣告組</th>
              <th scope="col" className="text-left py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">年齡</th>
              <th scope="col" className="text-left py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">性別</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">花費</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {adsets.map((adset) => (
              <tr 
                key={adset.id} 
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3 px-2">
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-[200px]" title={adset.adset_name}>
                      {adset.adset_name}
                    </p>
                    {adset.campaign_name && (
                      <p className="text-xs text-gray-400 truncate max-w-[200px]" title={adset.campaign_name}>
                        {adset.campaign_name}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-700">
                  {adset.targeting.age_min && adset.targeting.age_max 
                    ? `${adset.targeting.age_min}-${adset.targeting.age_max}` 
                    : '-'}
                </td>
                <td className="py-3 px-2 text-gray-700">
                  {adset.targeting.genders?.map(g => genderMap[g]).join('/') || '全部'}
                </td>
                <td className="text-right py-3 px-2 text-gray-700 font-medium font-mono-nums">
                  {adset.spend ? `NT$${adset.spend.toLocaleString()}` : '-'}
                </td>
                <td className="text-right py-3 px-2">
                  {adset.roas ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      adset.roas >= 3 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : adset.roas >= 2 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {adset.roas.toFixed(2)}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export default TargetingAnalysis;
