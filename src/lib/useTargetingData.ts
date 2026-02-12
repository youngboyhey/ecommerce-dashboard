import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// 受眾分析資料結構
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

export function useTargetingData(): UseTargetingDataResult {
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
      const { data, error: fetchError } = await supabase
        .from('meta_adsets')
        .select('*')
        .order('spend', { ascending: false });

      if (fetchError) {
        console.error('Error fetching meta_adsets:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Parse targeting JSON for each adset
      const parsedAdsets: AdsetWithTargeting[] = (data || []).map((row) => {
        let targeting = row.targeting;
        
        // Parse targeting if it's a string
        if (typeof targeting === 'string') {
          try {
            targeting = JSON.parse(targeting);
          } catch (e) {
            console.warn('Failed to parse targeting JSON:', e);
            targeting = {
              score: 0,
              strengths: [],
              weaknesses: [],
              suggestions: [],
            };
          }
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
          targeting: targeting as TargetingAnalysisData,
        };
      });

      setAdsets(parsedAdsets);
    } catch (err) {
      console.error('Error in useTargetingData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
