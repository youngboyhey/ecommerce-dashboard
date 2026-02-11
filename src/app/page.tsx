'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Target,
  BarChart3,
  Calendar,
  RefreshCw
} from 'lucide-react';

import KPICard from '@/components/KPICard';
import RevenueTrendChart from '@/components/RevenueTrendChart';
import MetaAdsChart from '@/components/MetaAdsChart';
import GA4Funnel from '@/components/GA4Funnel';
import AudienceAnalysis from '@/components/AudienceAnalysis';
import ProductRanking from '@/components/ProductRanking';
import ChannelPerformance from '@/components/ChannelPerformance';
import { mockReportData } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const data = mockReportData;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CarMall Dashboard</h1>
                <p className="text-xs text-gray-500">車魔商城電商數據儀表板</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Date Range Display */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(data.start_date)} - {formatDate(data.end_date)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.mode === 'weekly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {data.mode === 'weekly' ? '週報' : '日報'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="總營收"
            value={data.summary.total_revenue}
            format="currency"
            change={data.wow?.cyber_revenue_change}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPICard
            title="廣告花費"
            value={data.summary.total_spend}
            format="currency"
            icon={<Target className="w-5 h-5" />}
          />
          <KPICard
            title="ROAS"
            value={data.summary.roas}
            format="roas"
            change={data.wow?.meta_roas_change}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KPICard
            title="訂單數"
            value={data.summary.order_count}
            format="number"
            icon={<ShoppingCart className="w-5 h-5" />}
          />
        </section>

        {/* Secondary KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">MER</p>
            <p className="text-xl font-bold text-gray-900">{(data.summary.mer * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">客單價 (AOV)</p>
            <p className="text-xl font-bold text-gray-900">NT${data.summary.aov.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">GA4 Sessions</p>
            <p className="text-xl font-bold text-gray-900">{data.summary.ga4_sessions}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">轉換率</p>
            <p className="text-xl font-bold text-green-600">{data.summary.ga4_overall_conversion}%</p>
          </div>
        </section>

        {/* Charts Row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RevenueTrendChart />
          <MetaAdsChart />
        </section>

        {/* Charts Row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GA4Funnel />
          <AudienceAnalysis />
        </section>

        {/* Charts Row 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProductRanking />
          <ChannelPerformance />
        </section>

        {/* Summary Banner */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">📊 本週洞察</h3>
              <p className="text-blue-100 text-sm">
                最佳受眾: <span className="text-white font-medium">{data.summary.top_audience_segment}</span> | 
                熱銷商品: <span className="text-white font-medium">{data.summary.top_product}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">由龍蝦企業 🦞 驅動</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>CarMall 電商 Dashboard v1.0</p>
            <p>最後更新: {new Date(data.generated_at).toLocaleString('zh-TW')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
