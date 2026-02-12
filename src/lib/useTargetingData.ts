import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// 受眾分析資料結構（已處理）
export interface TargetingAnalysisData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  age_assessment?: string;
  gender_assessment?: string;
  interest_assessment?: string;
  custom_audience_assessment?: string;
}

// 資料庫中的原始受眾設定格式
interface RawTargetingData {
  genders?: string[];
  age_range?: string;
  interests?: string[];
  locations?: string[];
  custom_audiences?: string[];
}

// 將原始受眾設定轉換為分析結果
function analyzeTargeting(raw: RawTargetingData | null): TargetingAnalysisData {
  if (!raw) {
    return {
      score: 0,
      strengths: [],
      weaknesses: ['無受眾設定資料'],
      suggestions: ['請設定受眾條件'],
    };
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];
  let score = 5; // 基礎分數

  // 分析年齡
  const ageRange = raw.age_range || '';
  let age_assessment = '';
  if (ageRange === '18+' || ageRange === '18-65+' || ageRange.includes('65+')) {
    weaknesses.push('年齡範圍過廣（' + ageRange + '）');
    suggestions.push('建議縮窄年齡至核心客群，如 25-45 歲');
    age_assessment = '年齡設定過廣，可能導致預算浪費在非目標客群';
    score -= 1;
  } else if (ageRange) {
    strengths.push('已設定明確年齡範圍（' + ageRange + '）');
    age_assessment = '年齡設定合理';
    score += 0.5;
  }

  // 分析性別
  const genders = raw.genders || [];
  let gender_assessment = '';
  if (genders.includes('不限') || genders.length === 0) {
    // 不限性別可能是有意為之，不扣分但給建議
    gender_assessment = '性別不限，適合大眾產品';
  } else {
    strengths.push('已鎖定性別：' + genders.join('、'));
    gender_assessment = '已針對特定性別優化';
    score += 0.5;
  }

  // 分析興趣標籤
  const interests = raw.interests || [];
  let interest_assessment = '';
  if (interests.length === 0) {
    weaknesses.push('未設定興趣標籤');
    suggestions.push('建議新增與產品相關的興趣標籤');
    interest_assessment = '缺少興趣定向';
    score -= 1;
  } else if (interests.length >= 10) {
    strengths.push('興趣標籤豐富（' + interests.length + ' 個）');
    interest_assessment = '興趣定向完整，涵蓋 ' + interests.length + ' 個興趣類別';
    score += 1;
    // 提取部分興趣顯示
    const sampleInterests = interests.slice(0, 5).join('、');
    strengths.push('包含：' + sampleInterests + '...');
  } else if (interests.length >= 5) {
    strengths.push('設定 ' + interests.length + ' 個興趣標籤');
    interest_assessment = '興趣設定適中';
    score += 0.5;
  } else {
    weaknesses.push('興趣標籤偏少（僅 ' + interests.length + ' 個）');
    suggestions.push('可考慮新增更多相關興趣以擴大觸及');
    interest_assessment = '興趣標籤數量不足';
  }

  // 分析自訂受眾
  const customAudiences = raw.custom_audiences || [];
  let custom_audience_assessment = '';
  if (customAudiences.length > 0) {
    strengths.push('已使用自訂受眾（' + customAudiences.length + ' 個）');
    custom_audience_assessment = '使用自訂受眾可提高精準度';
    score += 1;
  } else {
    suggestions.push('建議建立類似受眾或再行銷受眾');
    custom_audience_assessment = '未使用自訂受眾';
  }

  // 分析地區
  const locations = raw.locations || [];
  if (locations.length > 0) {
    strengths.push('已設定投放地區：' + locations.join('、'));
  }

  // 確保分數在 0-10 範圍
  score = Math.max(0, Math.min(10, score));

  return {
    score: Math.round(score * 10) / 10,
    strengths,
    weaknesses,
    suggestions,
    age_assessment,
    gender_assessment,
    interest_assessment,
    custom_audience_assessment,
  };
}

export interface AdsetWithTargeting {
  id: string;
  adset_id: string;
  adset_name: string;
  campaign_name?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  purchases?: number;
  roas?: number;
  ctr?: number;
  cvr?: number;  // 計算欄位：purchases / clicks * 100
  targeting: TargetingAnalysisData;
}

interface UseTargetingDataResult {
  adsets: AdsetWithTargeting[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// weekStart: 用來查找對應週報告的 report_id，再過濾 meta_adsets
export function useTargetingData(weekStart?: string): UseTargetingDataResult {
  const [adsets, setAdsets] = useState<AdsetWithTargeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🔧 修正：先根據 weekStart 找到對應的 report_id
      let reportId: string | null = null;
      
      if (weekStart) {
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('id')
          .eq('mode', 'weekly')
          .eq('start_date', weekStart)
          .single();
        
        if (reportError) {
          console.warn('Failed to find report for week:', weekStart, reportError);
        } else if (reportData) {
          reportId = reportData.id;
          console.log(`Found report_id ${reportId} for week starting ${weekStart}`);
        }
      }
      
      // Build query - 使用 report_id 過濾
      let query = supabase
        .from('meta_adsets')
        .select('*');
      
      // 🔧 修正：如果有 report_id，加上過濾條件
      if (reportId) {
        query = query.eq('report_id', reportId);
      }
      
      const { data, error: fetchError } = await query.order('spend', { ascending: false });

      if (fetchError) {
        console.error('Error fetching meta_adsets:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Parse targeting JSON for each adset
      const parsedAdsets: AdsetWithTargeting[] = (data || []).map((row) => {
        let rawTargeting = row.targeting;
        
        // Parse targeting if it's a string
        if (typeof rawTargeting === 'string') {
          try {
            rawTargeting = JSON.parse(rawTargeting);
          } catch (e) {
            console.warn('Failed to parse targeting JSON:', e);
            rawTargeting = null;
          }
        }

        // 判斷 targeting 格式：是原始格式還是已分析格式
        let targeting: TargetingAnalysisData;
        if (rawTargeting && typeof rawTargeting.score === 'number') {
          // 已經是分析過的格式
          targeting = rawTargeting as TargetingAnalysisData;
        } else {
          // 原始受眾設定格式，需要轉換
          targeting = analyzeTargeting(rawTargeting as RawTargetingData);
        }

        // 計算衍生指標
        const impressions = row.impressions || 0;
        const clicks = row.clicks || 0;
        const purchases = row.purchases || 0;
        
        return {
          id: row.id,
          adset_id: row.adset_id,
          adset_name: row.adset_name,
          campaign_name: row.campaign_name,
          spend: row.spend,
          impressions,
          clicks,
          purchases,
          roas: row.roas,
          // CTR = clicks / impressions * 100
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          // CVR = purchases / clicks * 100 ⬅️ 正確的 CVR 計算
          cvr: clicks > 0 ? (purchases / clicks) * 100 : 0,
          targeting,
        };
      });

      setAdsets(parsedAdsets);
    } catch (err) {
      console.error('Error in useTargetingData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    adsets,
    isLoading,
    error,
    refresh: fetchData,
  };
}
