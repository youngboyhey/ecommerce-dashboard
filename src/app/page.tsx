'use client';

import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  Wifi,
  WifiOff,
  Users
} from 'lucide-react';

import AlertBanner from '@/components/AlertBanner';
import KPICard from '@/components/KPICard';
import WeekSelector from '@/components/WeekSelector';
import RevenueTrendChart from '@/components/RevenueTrendChart';
import MetaAdsChart from '@/components/MetaAdsChart';
import GA4Funnel from '@/components/GA4Funnel';
import NewVsReturningCard from '@/components/NewVsReturningCard';
import AudienceAnalysis from '@/components/AudienceAnalysis';
import ProductRanking from '@/components/ProductRanking';
import ChannelPerformance from '@/components/ChannelPerformance';
import DeviceBreakdown from '@/components/DeviceBreakdown';
import GSCPerformance from '@/components/GSCPerformance';
import { useReportData, DateRange } from '@/lib/useReportData';
import { useWeeklyData } from '@/lib/useWeeklyData';
import { formatDate } from '@/lib/utils';
import { useMemo } from 'react';

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

  const handleRefresh = async () => {
    await refresh();
  };

  // 使用週報比較數據（如果有的話）
  const weeklyData = comparisonData?.current;
  const weeklyChanges = comparisonData?.changes;

  // 計算警示所需的指標
  // 模擬 CPM 和 Frequency（實際應從 Meta API 取得）
  const estimatedCpm = data.summary.total_spend > 0 
    ? (data.summary.total_spend / (data.meta.total.clicks / (data.meta.total.ctr / 100))) * 1000 
    : 0;
  const estimatedFrequency = 1.8; // 模擬值，實際需從 Meta API 取得
  
  // 購物車放棄率
  const cartAbandonRate = data.ga4.funnel_rates.atc_drop_off || 0;
  
  // 計算跳出率（簡化計算）
  const bounceRate = 100 - (data.ga4.funnel_rates.session_to_atc * 2) || 55;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      {/* Header - 改善響應式設計 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">CarMall Dashboard</h1>
                <p className="text-xs text-gray-500">車魔商城電商數據儀表板</p>
              </div>
              <h1 className="sm:hidden text-lg font-bold text-gray-900">CarMall</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Week Selector */}
              <div className="hidden md:flex items-center gap-3">
                <WeekSelector 
                  options={weekOptions}
                  selected={selectedWeek}
                  onChange={setSelectedWeek}
                />
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  週報
                </span>
              </div>

              {/* Mobile Date Badge */}
              <div className="md:hidden">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  data.mode === 'weekly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {data.mode === 'weekly' ? '週報' : '日報'}
                </span>
              </div>

              {/* Data Source Indicator */}
              <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold ${
                isLive 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {isLive ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isLive ? 'Live Data' : 'Mock Data'}</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                disabled={isLoading}
                aria-label="重新載入數據"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        
        {/* 🚨 Zone 1: 警示區塊 (固定頂部) */}
        <section aria-labelledby="alert-section" className="mb-6">
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
        <section aria-labelledby="kpi-section-title" className="mb-8">
          <h2 id="kpi-section-title" className="sr-only">關鍵績效指標</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <KPICard
              title="💰 總營收"
              value={weeklyData?.revenue ?? data.summary.total_revenue}
              format="currency"
              change={weeklyChanges?.revenue ?? data.wow?.cyber_revenue_change}
              changeLabel="vs 上週"
              icon={<DollarSign className="w-5 h-5" />}
              theme="revenue"
            />
            <KPICard
              title="📦 訂單數"
              value={weeklyData?.orders ?? data.summary.order_count}
              format="number"
              change={weeklyChanges?.orders ?? undefined}
              changeLabel="vs 上週"
              icon={<ShoppingCart className="w-5 h-5" />}
              theme="orders"
            />
            <KPICard
              title="📊 MER"
              value={weeklyData?.mer ?? (data.summary.total_spend > 0 ? data.summary.total_revenue / data.summary.total_spend : 0)}
              format="roas"
              change={weeklyChanges?.mer ?? undefined}
              changeLabel="vs 上週"
              icon={<TrendingUp className="w-5 h-5" />}
              theme="roas"
            />
            <KPICard
              title="👤 新增會員"
              value={weeklyData?.newMembers ?? data.summary.new_members}
              format="number"
              change={weeklyChanges?.newMembers ?? undefined}
              changeLabel="vs 上週"
              icon={<Users className="w-5 h-5" />}
              theme="orders"
            />
          </div>
        </section>

        {/* Secondary KPIs - 第二排 */}
        <section aria-labelledby="secondary-kpi-title" className="mb-8">
          <h2 id="secondary-kpi-title" className="sr-only">次要績效指標</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-gray-500 mb-1">💸 廣告花費</p>
              <p className="text-xl font-bold text-gray-900">NT${(weeklyData?.adSpend ?? data.summary.total_spend).toLocaleString()}</p>
              {weeklyChanges?.adSpend !== null && weeklyChanges?.adSpend !== undefined && (
                <p className={`text-xs mt-1 ${weeklyChanges.adSpend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {weeklyChanges.adSpend > 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.adSpend).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-gray-500 mb-1">💰 客單價 (AOV)</p>
              <p className="text-xl font-bold text-gray-900">NT${(weeklyData?.aov ?? data.summary.aov).toFixed(0)}</p>
              {weeklyChanges?.aov !== null && weeklyChanges?.aov !== undefined && (
                <p className={`text-xs mt-1 ${weeklyChanges.aov >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyChanges.aov >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.aov).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-gray-500 mb-1">📈 廣告 ROAS</p>
              <p className="text-xl font-bold text-blue-600">{(weeklyData?.roas ?? data.summary.roas).toFixed(2)}</p>
              {weeklyChanges?.roas !== null && weeklyChanges?.roas !== undefined && (
                <p className={`text-xs mt-1 ${weeklyChanges.roas >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyChanges.roas >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.roas).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-gray-500 mb-1">🎯 轉換率</p>
              <p className="text-xl font-bold text-emerald-600">{(weeklyData?.conversion ?? data.summary.ga4_overall_conversion).toFixed(2)}%</p>
              {weeklyChanges?.conversion !== null && weeklyChanges?.conversion !== undefined && (
                <p className={`text-xs mt-1 ${weeklyChanges.conversion >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {weeklyChanges.conversion >= 0 ? '↑' : '↓'} {Math.abs(weeklyChanges.conversion).toFixed(1)}% vs 上週
                </p>
              )}
            </article>
          </div>
        </section>

        {/* 📊 Zone 3: 趨勢與效率區 */}
        <section aria-label="營收與廣告效率" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📊</span> 趨勢與效率
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <section aria-label="網站行為分析" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔄</span> 網站行為分析
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              <GA4Funnel data={data.ga4} />
              <NewVsReturningCard data={data.ga4} />
            </div>
            <div className="flex flex-col gap-6">
              <AudienceAnalysis data={data.meta_audience} />
              <DeviceBreakdown data={data.ga4_devices} isLive={isLive} />
            </div>
          </div>
        </section>

        {/* 🏆 Zone 5: 商品與 SEO 區 */}
        <section aria-label="商品與 SEO 分析" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🏆</span> 商品與 SEO
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                page: p.page_path,
                impressions: p.impressions,
                clicks: p.clicks,
                ctr: p.ctr,
                position: p.position,
              }))}
            />
          </div>
        </section>

        {/* 流量來源分析 */}
        <section aria-label="流量來源分析" className="mb-8">
          <ChannelPerformance data={data.ga4_channels} />
        </section>

        {/* Summary Banner */}
        <section 
          className="bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-purple-500/20"
          aria-labelledby="insights-title"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 id="insights-title" className="text-lg font-bold mb-2 flex items-center gap-2">
                <span>📊</span> 本週洞察
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-100">
                <p>
                  最佳受眾: <span className="text-white font-semibold">{data.summary.top_audience_segment}</span>
                </p>
                <p>
                  熱銷商品: <span className="text-white font-semibold">{data.summary.top_product}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-full">
              <span>由龍蝦企業 🦞 驅動</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <p>CarMall 電商 Dashboard v2.0 — 依螃蟹規劃重構 🦀</p>
            <p className="flex items-center gap-2">
              最後更新: {lastUpdated 
                ? lastUpdated.toLocaleString('zh-TW') 
                : new Date(data.generated_at).toLocaleString('zh-TW')
              }
              {isLive && <span className="text-emerald-500 font-medium">● Live</span>}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
