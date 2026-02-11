import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { AdCreative } from '@/components/CreativeAnalysis';
import type { AdCopy } from '@/components/CopyAnalysis';
import type { WeeklyInsight, InsightTracking } from '@/components/WeeklyInsights';

interface UseWeeklyAnalysisResult {
  creatives: AdCreative[];
  copies: AdCopy[];
  weeklyInsight: WeeklyInsight | null;
  trackingData: InsightTracking[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateInsightStatus: (insightId: string, status: InsightTracking['status'], notes?: string) => Promise<void>;
}

export function useWeeklyAnalysis(reportDate?: string): UseWeeklyAnalysisResult {
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [copies, setCopies] = useState<AdCopy[]>([]);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight | null>(null);
  const [trackingData, setTrackingData] = useState<InsightTracking[]>([]);
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
      // Build date filter
      const dateFilter = reportDate || new Date().toISOString().split('T')[0];

      // Fetch all data in parallel
      const [creativesRes, copiesRes, insightsRes] = await Promise.all([
        supabase
          .from('ad_creatives')
          .select('*')
          .eq('report_date', dateFilter)
          .order('performance_rank', { ascending: true }),
        
        supabase
          .from('ad_copies')
          .select('*')
          .eq('report_date', dateFilter)
          .order('performance_rank', { ascending: true }),
        
        supabase
          .from('weekly_insights')
          .select('*')
          .eq('report_date', dateFilter)
          .single(),
      ]);

      // Handle creatives
      if (creativesRes.error && creativesRes.error.code !== 'PGRST116') {
        console.warn('Error fetching ad_creatives:', creativesRes.error);
      }
      setCreatives((creativesRes.data || []) as AdCreative[]);

      // Handle copies
      if (copiesRes.error && copiesRes.error.code !== 'PGRST116') {
        console.warn('Error fetching ad_copies:', copiesRes.error);
      }
      setCopies((copiesRes.data || []) as AdCopy[]);

      // Handle weekly insights
      if (insightsRes.error && insightsRes.error.code !== 'PGRST116') {
        console.warn('Error fetching weekly_insights:', insightsRes.error);
        setWeeklyInsight(null);
      } else if (insightsRes.data) {
        const rawInsight = insightsRes.data;
        
        // Parse insights if it's a double-stringified JSON string
        let parsedInsights = rawInsight.insights;
        if (typeof parsedInsights === 'string') {
          try {
            parsedInsights = JSON.parse(parsedInsights);
          } catch (e) {
            console.warn('Failed to parse insights JSON:', e);
            parsedInsights = [];
          }
        }
        
        // Parse summary if it's a double-stringified JSON string
        let parsedSummary = rawInsight.summary;
        if (typeof parsedSummary === 'string') {
          try {
            parsedSummary = JSON.parse(parsedSummary);
          } catch (e) {
            console.warn('Failed to parse summary JSON:', e);
            parsedSummary = null;
          }
        }
        
        const insight: WeeklyInsight = {
          ...rawInsight,
          insights: parsedInsights || [],
          summary: parsedSummary,
        };
        setWeeklyInsight(insight);

        // Fetch tracking data for this insight
        const trackingRes = await supabase
          .from('insight_tracking')
          .select('*')
          .eq('weekly_insight_id', insight.id);

        if (trackingRes.error && trackingRes.error.code !== 'PGRST116') {
          console.warn('Error fetching insight_tracking:', trackingRes.error);
        }
        setTrackingData((trackingRes.data || []) as InsightTracking[]);
      } else {
        setWeeklyInsight(null);
        setTrackingData([]);
      }

    } catch (err) {
      console.error('Error in useWeeklyAnalysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [reportDate]);

  // Update insight status
  const updateInsightStatus = useCallback(async (
    insightId: string, 
    status: InsightTracking['status'], 
    notes?: string
  ) => {
    if (!supabase || !weeklyInsight) {
      throw new Error('Supabase not configured or no weekly insight');
    }

    const existingTracking = trackingData.find(t => t.insight_id === insightId);

    if (existingTracking) {
      // Update existing tracking
      const { error } = await supabase
        .from('insight_tracking')
        .update({
          status,
          status_notes: notes || existingTracking.status_notes,
          status_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTracking.id);

      if (error) throw error;

      // Update local state
      setTrackingData(prev => prev.map(t => 
        t.id === existingTracking.id 
          ? { ...t, status, status_notes: notes || t.status_notes }
          : t
      ));
    } else {
      // Create new tracking
      const { data, error } = await supabase
        .from('insight_tracking')
        .insert({
          weekly_insight_id: weeklyInsight.id,
          insight_id: insightId,
          status,
          status_notes: notes,
          status_updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTrackingData(prev => [...prev, data as InsightTracking]);
    }
  }, [weeklyInsight, trackingData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    creatives,
    copies,
    weeklyInsight,
    trackingData,
    isLoading,
    error,
    refresh: fetchData,
    updateInsightStatus,
  };
}

// Export types for components
export type { AdCreative, AdCopy, WeeklyInsight, InsightTracking };
