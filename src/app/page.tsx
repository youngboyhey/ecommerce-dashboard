'use client';

import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  Sparkles
} from 'lucide-react';

import AlertBanner from '@/components/AlertBanner';
import KPICard from '@/components/KPICard';
import WeekSelector from '@/components/WeekSelector';
import RevenueTrendChart from '@/components/RevenueTrendChart';
import MetaAdsChart from '@/components/MetaAdsChart';
import GA4Funnel from '@/components/GA4Funnel';
import AudienceAnalysis from '@/components/AudienceAnalysis';
import ProductRanking from '@/components/ProductRanking';
import ChannelPerformance from '@/components/ChannelPerformance';
import DeviceBreakdown from '@/components/DeviceBreakdown';
import GSCPerformance from '@/components/GSCPerformance';
import TargetingAnalysis from '@/components/TargetingAnalysis';
import CreativeAnalysis from '@/components/CreativeAnalysis';
import CopyAnalysis from '@/components/CopyAnalysis';
import WeeklyInsights from '@/components/WeeklyInsights';
import { AdMetricsProvider } from '@/contexts/AdMetricsContext';
import { useReportData, DateRange } from '@/lib/useReportData';
import { useWeeklyData } from '@/lib/useWeeklyData';
import { useWeeklyAnalysis } from '@/lib/useWeeklyAnalysis';
import { useMemo, useCallback } from 'react';

export default function Dashboard() {
  const { 
    weekOptions, 
    selectedWeek, 
    setSelectedWeek, 
    comparisonData,
    isLoading: weekLoading 
  } = useWeeklyData();

  // 當選擇了特定週時，傳入日期範圍給 useReportData
  const dateRange: DateRange | undefined = useMemo(() => {
    if (selectedWeek) {
      return { start: selectedWeek.startDate, end: selectedWeek.endDate };
    }
    return undefined;
  }, [selectedWeek]);

  const { data, isLoading, isLive, lastUpdated, refresh } = useReportData('weekly', dateRange);

  // 週報分析數據（廣告素材、文案、洞察）
  const reportDateForAnalysis = useMemo(() => {
    if (selectedWeek) {
      return selectedWeek.endDate;
    }
    return undefined;
  }, [selectedWeek]);

  const {
    creatives,
    copies,
    weeklyInsight,
    trackingData,
    isLoading: analysisLoading,
    updateInsightStatus,
  } = useWeeklyAnalysis(reportDateForAnalysis);

  // 處理洞察狀態更新
  const handleInsightStatusChange = useCallback(async (
    insightId: string, 
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
    notes?: string
  ) => {
    await updateInsightStatus(insightId, status, notes);
  }, [updateInsightStatus]);

  const handleRefresh = async () => {
    await refresh();
  };

  // 使用週報比較數據（如果有的話）
  const weeklyData = comparisonData?.current;
  const weeklyChanges = comparisonData?.changes;

  // 計算警示所需的指標
  const estimatedCpm = data.summary.total_spend > 0 
    ? (data.summary.total_spend / (data.meta.total.clicks / (data.meta.total.ctr / 100))) * 1000 
    : 0;
  const estimatedFrequency = 1.8;
  const cartAbandonRate = data.ga4.funnel_rates.atc_drop_off || 0;
  const bounceRate = 100 - (data.ga4.funnel_rates.session_to_atc * 2) || 55;

  return (
    <AdMetricsProvider reportDate={reportDateForAnalysis}>
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ===== Header - 白色導航 ===== */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-glow-pulse">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold gradient-text">CarMall Dashboard</h1>
                <p className="text-xs text-gray-500">車魔商城電商數據儀表板</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-bold gradient-text">CarMall Dashboard</h1>
                <p className="text-[10px] text-gray-500">車魔商城電商數據儀表板</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 sm:gap-4">
              {/* Week Selector - Desktop Only */}
              <div className="hidden md:flex items-center gap-3">
                <WeekSelector 
                  options={weekOptions}
                  selected={selectedWeek}
                  onChange={setSelectedWeek}
                />
              </div>

              {/* Data Source Indicator */}
              <div className={`badge ${isLive ? 'badge-success' : 'badge-warning'}`}>
                {isLive ? <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                <span className="hidden sm:inline">{isLive ? 'Live' : 'Mock'}</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="btn-glass p-2 sm:p-2.5"
                disabled={isLoading}
                aria-label="重新載入數據"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Week Selector Bar - 手機版獨立一行 */}
        <div className="md:hidden border-t border-gray-100 px-3 py-2 flex items-center justify-end bg-gray-50/50">
          <WeekSelector 
            options={weekOptions}
            selected={selectedWeek}
            onChange={setSelectedWeek}
          />
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        
        {/* 🚨 Zone 1: 警示區塊 */}
        <section aria-labelledby="alert-section" className="mb-4 sm:mb-6 animate-fade-in-up">
          <h2 id="alert-section" className="sr-only">營運警示</h2>
          <AlertBanner
            roas={data.summary.roas}
            cpm={estimatedCpm > 0 ? estimatedCpm : undefined}
            frequency={estimatedFrequency}
            todayOrders={data.summary.order_count}
            cpa={data.meta.total.cpa}
            targetCpa={500}
            bounceRate={bounceRate}
            cartAbandonRate={cartAbandonRate}
          />
        </section>

        {/* 💰 Zone 2: 核心 KPI Cards - 第一排 */}
        <section aria-labelledby="kpi-section-title" className="mb-4 sm:mb-6 lg:mb-8">
          <h2 id="kpi-section-title" className="sr-only">關鍵績效指標</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            <div className="animate-fade-in-up stagger-1">
              <KPICard
                title="💰 總營收"
                value={weeklyData?.revenue ?? data.summary.total_revenue}
                format="currency"
                change={weeklyChanges?.revenue ?? data.wow?.cyber_revenue_change}
                changeLabel="vs 上週"
                icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
                theme="revenue"
              />
            </div>
            <div className="animate-fade-in-up stagger-2">
              <KPICard
                title="📦 訂單數"
                value={weeklyData?.orders ?? data.summary.order_count}
                format="number"
                change={weeklyChanges?.orders ?? undefined}
                changeLabel="vs 上週"
                icon={<ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />}
                theme="orders"
              />
            </div>
            <div className="animate-fade-in-up stagger-3">
              <KPICard
                title="📊 MER"
                value={weeklyData?.mer ?? (data.summary.total_spend > 0 ? data.summary.total_revenue / data.summary.total_spend : 0)}
                format="roas"
                change={weeklyChanges?.mer ?? undefined}
                changeLabel="vs 上週"
                icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                theme="roas"
              />
            </div>
            <div className="animate-fade-in-up stagger-4">
              <KPICard
                title="👤 新增會員"
                value={weeklyData?.newMembers ?? data.summary.new_members}
                format="number"
                change={weeklyChanges?.newMembers ?? undefined}
                changeLabel="vs 上週"
                icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
                theme="orders"
              />
            </div>
          </div>
        </section>

        {/* Secondary KPIs - 第二排 */}
        <section aria-labelledby="secondary-kpi-title" className="mb-4 sm:mb-6 lg:mb-8">
          <h2 id="secondary-kpi-title" className="sr-only">次要績效指標</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <article className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1 sm:mb-2">💸 廣告花費</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 font-mono-nums truncate">
                NT${(weeklyData?.adSpend ?? data.summary.total_spend).toLocaleString()}
              </p>
              {weeklyChanges?.adSpend !== null && weeklyChanges?.adSpend !== undefined && (
                <p className={`text-xs mt-1 sm:mt-2 ${weeklyChanges.adSpend > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {weeklyChanges.adSpend > 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.adSpend).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1 sm:mb-2">💰 客單價</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 font-mono-nums truncate">
                NT${(weeklyData?.aov ?? data.summary.aov).toFixed(0)}
              </p>
              {weeklyChanges?.aov !== null && weeklyChanges?.aov !== undefined && (
                <p className={`text-xs mt-1 sm:mt-2 ${weeklyChanges.aov >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {weeklyChanges.aov >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.aov).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1 sm:mb-2">📈 廣告 ROAS</p>
              <p className="text-lg sm:text-2xl font-bold text-indigo-600 font-mono-nums">
                {(weeklyData?.roas ?? data.summary.roas).toFixed(2)}
              </p>
              {weeklyChanges?.roas !== null && weeklyChanges?.roas !== undefined && (
                <p className={`text-xs mt-1 sm:mt-2 ${weeklyChanges.roas >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {weeklyChanges.roas >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.roas).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1 sm:mb-2">🎯 轉換率</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 font-mono-nums">
                {(weeklyData?.conversion ?? data.summary.ga4_overall_conversion).toFixed(2)}%
              </p>
              {weeklyChanges?.conversion !== null && weeklyChanges?.conversion !== undefined && (
                <p className={`text-xs mt-1 sm:mt-2 ${weeklyChanges.conversion >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {weeklyChanges.conversion >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.conversion).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
          </div>
        </section>

        {/* 📊 Zone 3: 趨勢與效率區 */}
        <section aria-label="營收與廣告效率" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm sm:text-base">
              📊
            </span>
            <span className="gradient-text-subtle">趨勢與效率</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <RevenueTrendChart 
              dateRange={selectedWeek ? { start: selectedWeek.startDate, end: selectedWeek.endDate } : undefined}
            />
            <MetaAdsChart 
              campaigns={data.meta.campaigns}
              total={data.meta.total}
            />
          </div>
        </section>

        {/* 🔄 Zone 4: 網站行為分析區 */}
        <section aria-label="網站行為分析" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-sm sm:text-base">
              🔄
            </span>
            <span className="gradient-text-subtle">網站行為分析</span>
          </h3>
          <div className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
            <div className="col-span-12 lg:col-span-6">
              <GA4Funnel data={data.ga4} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <AudienceAnalysis data={data.meta_audience} />
            </div>
            <div className="col-span-12">
              <DeviceBreakdown data={data.ga4_devices} isLive={isLive} />
            </div>
          </div>
        </section>

        {/* 🏆 Zone 5: 商品與 SEO 區 */}
        <section aria-label="商品與 SEO 分析" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-sm sm:text-base">
              🏆
            </span>
            <span className="gradient-text-subtle">商品與 SEO</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <ProductRanking products={data.cyberbiz.product_ranking} summary={data.cyberbiz} />
            <GSCPerformance 
              summary={data.gsc?.total ? {
                totalImpressions: data.gsc.total.impressions,
                totalClicks: data.gsc.total.clicks,
                avgCtr: data.gsc.total.ctr,
                avgPosition: data.gsc.total.position,
              } : undefined}
              keywords={data.gsc?.top_queries?.map(q => ({
                keyword: q.query,
                impressions: q.impressions,
                clicks: q.clicks,
                ctr: q.ctr,
                position: q.position,
              }))}
              pages={data.gsc?.top_pages?.map(p => ({
                page: p.page,
                title: p.title,
                impressions: p.impressions,
                clicks: p.clicks,
                ctr: p.ctr,
                position: p.position,
              }))}
            />
          </div>
        </section>

        {/* 流量來源分析 */}
        <section aria-label="流量來源分析" className="mb-4 sm:mb-6 lg:mb-8">
          <ChannelPerformance data={data.ga4_channels} />
        </section>

        {/* 🎯 Zone 5.5: 廣告受眾設定 */}
        <section aria-label="廣告受眾設定" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-sm sm:text-base">
              🎯
            </span>
            <span className="gradient-text-subtle">廣告受眾設定</span>
          </h3>
          <TargetingAnalysis isLoading={analysisLoading} />
        </section>

        {/* 🎨 Zone 6: 廣告素材分析 */}
        <section aria-label="廣告素材分析" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-sm sm:text-base">
              🎨
            </span>
            <span className="gradient-text-subtle">廣告素材分析</span>
          </h3>
          <CreativeAnalysis 
            creatives={creatives} 
            isLoading={analysisLoading} 
          />
        </section>

        {/* ✍️ Zone 7: 廣告文案分析 */}
        <section aria-label="廣告文案分析" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-sm sm:text-base">
              ✍️
            </span>
            <span className="gradient-text-subtle">廣告文案分析</span>
          </h3>
          <CopyAnalysis 
            copies={copies} 
            isLoading={analysisLoading} 
          />
        </section>

        {/* 💡 Zone 8: 本週洞察 (放最底部) */}
        <section aria-label="本週洞察" className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm sm:text-base">
              💡
            </span>
            <span className="gradient-text-subtle">本週洞察</span>
          </h3>
          <WeeklyInsights 
            weeklyInsight={weeklyInsight}
            trackingData={trackingData}
            isLoading={analysisLoading}
            onStatusChange={handleInsightStatusChange}
          />
        </section>

      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-white border-t border-gray-100 mt-4 sm:mt-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
            <p className="text-center sm:text-left">CarMall 電商 Dashboard v3.0 — <span className="gradient-text-subtle font-medium">Minimal White Edition</span></p>
            <p className="flex items-center gap-2">
              最後更新: {lastUpdated 
                ? lastUpdated.toLocaleString('zh-TW') 
                : new Date(data.generated_at).toLocaleString('zh-TW')
              }
              {isLive && <span className="text-emerald-600 font-medium">● Live</span>}
            </p>
          </div>
        </div>
      </footer>
    </div>
    </AdMetricsProvider>
  );
}
