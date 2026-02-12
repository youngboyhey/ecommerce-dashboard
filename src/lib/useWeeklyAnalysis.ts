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
      // Build week filter - use week_start instead of report_date
      // If reportDate provided, use it as week_start; otherwise get latest week
      const weekFilter = reportDate || null;

      // Fetch all data in parallel
      // Use week_start field and order by it to get latest data
      const [creativesRes, copiesRes, insightsRes] = await Promise.all([
        weekFilter
          ? supabase
              .from('ad_creatives')
              .select('*')
              .eq('week_start', weekFilter)
              .order('performance_rank', { ascending: true })
          : supabase
              .from('ad_creatives')
              .select('*')
              .order('week_start', { ascending: false })
              .order('performance_rank', { ascending: true })
              .limit(50),
        
        weekFilter
          ? supabase
              .from('ad_copies')
              .select('*')
              .eq('week_start', weekFilter)
              .order('performance_rank', { ascending: true })
          : supabase
              .from('ad_copies')
              .select('*')
              .order('week_start', { ascending: false })
              .order('performance_rank', { ascending: true })
              .limit(50),
        
        weekFilter
          ? supabase
              .from('weekly_insights')
              .select('*')
              .eq('week_start', weekFilter)
              .single()
          : supabase
              .from('weekly_insights')
              .select('*')
              .order('week_start', { ascending: false })
              .limit(1)
              .single(),
      ]);

      // Handle creatives - parse JSON fields
      if (creativesRes.error && creativesRes.error.code !== 'PGRST116') {
        console.warn('Error fetching ad_creatives:', creativesRes.error);
      }
      const parsedCreatives = (creativesRes.data || []).map((c: Record<string, unknown>) => {
        let metrics = c.metrics;
        let visionAnalysis = c.vision_analysis;
        
        // Parse metrics if it's a string
        if (typeof metrics === 'string') {
          try {
            metrics = JSON.parse(metrics);
          } catch (e) {
            console.warn('Failed to parse creative metrics:', e);
            metrics = {};
          }
        }
        
        // Parse vision_analysis if it's a string
        if (typeof visionAnalysis === 'string') {
          try {
            visionAnalysis = JSON.parse(visionAnalysis);
          } catch (e) {
            console.warn('Failed to parse vision_analysis:', e);
            visionAnalysis = null;
          }
        }
        
        return { ...c, metrics: metrics || {}, vision_analysis: visionAnalysis };
      });
      setCreatives(parsedCreatives as AdCreative[]);

      // Handle copies - parse JSON fields
      if (copiesRes.error && copiesRes.error.code !== 'PGRST116') {
        console.warn('Error fetching ad_copies:', copiesRes.error);
      }
      const parsedCopies = (copiesRes.data || []).map((c: Record<string, unknown>) => {
        let metrics = c.metrics;
        let analysis = c.analysis;
        
        // Parse metrics if it's a string
        if (typeof metrics === 'string') {
          try {
            metrics = JSON.parse(metrics);
          } catch (e) {
            console.warn('Failed to parse copy metrics:', e);
            metrics = {};
          }
        }
        
        // Parse analysis if it's a string
        if (typeof analysis === 'string') {
          try {
            analysis = JSON.parse(analysis);
          } catch (e) {
            console.warn('Failed to parse copy analysis:', e);
            analysis = null;
          }
        }
        
        return { ...c, metrics: metrics || {}, analysis };
      });
      setCopies(parsedCopies as AdCopy[]);

      // Handle weekly insights
      if (insightsRes.error && insightsRes.error.code !== 'PGRST116') {
        console.warn('Error fetching weekly_insights:', insightsRes.error);
        setWeeklyInsight(null);
      } else if (insightsRes.data) {
        const rawInsight = insightsRes.data;
        
        // Parse insights if it's a double-stringified JSON string (舊格式)
        let parsedInsights = rawInsight.insights;
        if (typeof parsedInsights === 'string') {
          try {
            parsedInsights = JSON.parse(parsedInsights);
          } catch (e) {
            console.warn('Failed to parse insights JSON:', e);
            parsedInsights = [];
          }
        }
        // Ensure insights is always an array (fix: e.insights is not iterable)
        if (!Array.isArray(parsedInsights)) {
          console.warn('insights is not an array, defaulting to []:', parsedInsights);
          parsedInsights = [];
        }
        
        // 解析新格式欄位 (highlights, warnings, recommendations)
        let parsedHighlights = rawInsight.highlights;
        let parsedWarnings = rawInsight.warnings;
        let parsedRecommendations = rawInsight.recommendations;
        
        // Parse if stringified
        if (typeof parsedHighlights === 'string') {
          try { parsedHighlights = JSON.parse(parsedHighlights); } catch { parsedHighlights = []; }
        }
        if (typeof parsedWarnings === 'string') {
          try { parsedWarnings = JSON.parse(parsedWarnings); } catch { parsedWarnings = []; }
        }
        if (typeof parsedRecommendations === 'string') {
          try { parsedRecommendations = JSON.parse(parsedRecommendations); } catch { parsedRecommendations = []; }
        }
        
        // Ensure arrays
        parsedHighlights = Array.isArray(parsedHighlights) ? parsedHighlights : [];
        parsedWarnings = Array.isArray(parsedWarnings) ? parsedWarnings : [];
        parsedRecommendations = Array.isArray(parsedRecommendations) ? parsedRecommendations : [];
        
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
        // Ensure summary has expected shape or is null
        if (parsedSummary && typeof parsedSummary !== 'object') {
          console.warn('summary is not an object, defaulting to null:', parsedSummary);
          parsedSummary = null;
        }
        
        const insight: WeeklyInsight = {
          ...rawInsight,
          insights: parsedInsights,
          highlights: parsedHighlights,
          warnings: parsedWarnings,
          recommendations: parsedRecommendations,
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
