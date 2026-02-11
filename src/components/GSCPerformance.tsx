'use client';

import { memo, useMemo, useState } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  ChevronUp,
  ChevronDown,
  FileText,
  Hash,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 關鍵字數據類型
export interface KeywordData {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  positionChange?: number; // 相較上週
}

// 頁面數據類型
export interface PageData {
  page: string;
  title?: string; // 頁面標題
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

// GSC 總覽數據
export interface GSCSummary {
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  impressionsChange?: number; // 相較上週 %
  clicksChange?: number;
}

interface GSCPerformanceProps {
  summary?: GSCSummary;
  keywords?: KeywordData[];
  pages?: PageData[];
  className?: string;
}

type TabType = 'keywords' | 'pages';

const GSCPerformance = memo(function GSCPerformance({
  summary,
  keywords,
  pages,
  className,
}: GSCPerformanceProps) {
  const [activeTab, setActiveTab] = useState<TabType>('keywords');

  // 檢查是否有真實數據
  const hasData = summary || (keywords && keywords.length > 0) || (pages && pages.length > 0);
  const [sortBy, setSortBy] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 排序關鍵字
  const sortedKeywords = useMemo(() => {
    if (!keywords || keywords.length === 0) return [];
    return [...keywords].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      // position 低=好，所以反向
      if (sortBy === 'position') {
        return sortOrder === 'asc' ? bVal - aVal : aVal - bVal;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }).slice(0, 10);
  }, [keywords, sortBy, sortOrder]);

  // 排序頁面
  const sortedPages = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    return [...pages].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortBy === 'position') {
        return sortOrder === 'asc' ? bVal - aVal : aVal - bVal;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }).slice(0, 10);
  }, [pages, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  // 無數據時顯示提示卡片
  if (!hasData) {
    return (
      <section 
        className={cn(
          "bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6",
          className
        )}
        aria-labelledby="gsc-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="gsc-title" className="text-lg font-semibold text-gray-900">
            🔍 SEO 表現 (Google Search Console)
          </h2>
          <a 
            href="https://search.google.com/search-console" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            開啟 GSC <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 暫無數據提示 */}
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暫無 GSC 數據</h3>
          <p className="text-sm text-gray-500 text-center max-w-md mb-4">
            目前尚未連接 Google Search Console 或沒有可用的搜尋數據。
            請確認已正確設定 GSC 並等待數據收集。
          </p>
          <a 
            href="https://search.google.com/search-console" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            前往設定 GSC <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>
    );
  }

  return (
    <section 
      className={cn(
        "bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6",
        className
      )}
      aria-labelledby="gsc-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="gsc-title" className="text-lg font-semibold text-gray-900">
          🔍 SEO 表現 (Google Search Console)
        </h2>
        <a 
          href="https://search.google.com/search-console" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          開啟 GSC <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 總覽指標 */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-100">
            <p className="text-xs font-medium text-indigo-600 mb-1">總曝光數</p>
            <p className="text-2xl font-bold text-indigo-900">{summary.totalImpressions.toLocaleString()}</p>
            {summary.impressionsChange !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                summary.impressionsChange >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {summary.impressionsChange >= 0 
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />
                }
                <span>{Math.abs(summary.impressionsChange).toFixed(1)}% vs 上週</span>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-600 mb-1">總點擊數</p>
            <p className="text-2xl font-bold text-emerald-900">{summary.totalClicks.toLocaleString()}</p>
            {summary.clicksChange !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                summary.clicksChange >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {summary.clicksChange >= 0 
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />
                }
                <span>{Math.abs(summary.clicksChange).toFixed(1)}% vs 上週</span>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs font-medium text-purple-600 mb-1">平均 CTR</p>
            <p className="text-2xl font-bold text-purple-900">{summary.avgCtr.toFixed(2)}%</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs font-medium text-amber-600 mb-1">平均排名</p>
            <p className="text-2xl font-bold text-amber-900">{summary.avgPosition.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Tab 切換 - 只在有關鍵字或頁面數據時顯示 */}
      {(sortedKeywords.length > 0 || sortedPages.length > 0) && (
        <>
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('keywords')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === 'keywords'
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Hash className="w-4 h-4" />
              關鍵字 Top 10
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === 'pages'
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <FileText className="w-4 h-4" />
              頁面表現 Top 10
            </button>
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    {activeTab === 'keywords' ? '關鍵字' : '頁面'}
                  </th>
                  <th 
                    className="text-right py-3 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('impressions')}
                  >
                    <span className="inline-flex items-center gap-1">
                      曝光 <SortIcon column="impressions" />
                    </span>
                  </th>
                  <th 
                    className="text-right py-3 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('clicks')}
                  >
                    <span className="inline-flex items-center gap-1">
                      點擊 <SortIcon column="clicks" />
                    </span>
                  </th>
                  <th 
                    className="text-right py-3 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('ctr')}
                  >
                    <span className="inline-flex items-center gap-1">
                      CTR <SortIcon column="ctr" />
                    </span>
                  </th>
                  <th 
                    className="text-right py-3 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('position')}
                  >
                    <span className="inline-flex items-center gap-1">
                      排名 <SortIcon column="position" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'keywords' ? (
                  sortedKeywords.map((item, index) => (
                    <tr 
                      key={item.keyword} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs w-5">{index + 1}</span>
                          <span className="font-medium text-gray-900">{item.keyword}</span>
                          {item.position <= 3 && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">
                              Top 3
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-gray-700">
                        {item.impressions.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-indigo-600">
                        {item.clicks.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2 text-gray-700">
                        {item.ctr.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className={cn(
                            "font-medium",
                            item.position <= 10 ? "text-emerald-600" : "text-gray-700"
                          )}>
                            {item.position.toFixed(1)}
                          </span>
                          {item.positionChange !== undefined && (
                            <span className={cn(
                              "text-xs flex items-center",
                              item.positionChange > 0 ? "text-emerald-600" : item.positionChange < 0 ? "text-red-600" : "text-gray-400"
                            )}>
                              {item.positionChange > 0 ? (
                                <><TrendingUp className="w-3 h-3" /> +{item.positionChange.toFixed(1)}</>
                              ) : item.positionChange < 0 ? (
                                <><TrendingDown className="w-3 h-3" /> {item.positionChange.toFixed(1)}</>
                              ) : null}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  sortedPages.map((item, index) => (
                    <tr 
                      key={item.page} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 group">
                          <span className="text-gray-400 text-xs w-5">{index + 1}</span>
                          <div className="relative">
                            <span 
                              className="font-medium text-gray-900 truncate max-w-[200px] block cursor-help" 
                              title={item.page}
                            >
                              {item.title || item.page}
                            </span>
                            {/* URL 小字提示 */}
                            {item.title && (
                              <span className="text-xs text-gray-400 truncate max-w-[200px] block">
                                {item.page}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-gray-700">
                        {item.impressions.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-indigo-600">
                        {item.clicks.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2 text-gray-700">
                        {item.ctr.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className={cn(
                          "font-medium",
                          item.position <= 10 ? "text-emerald-600" : "text-gray-700"
                        )}>
                          {item.position.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 提示 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              GSC 數據約有 48 小時延遲，此為過去 7 天累計數據
            </p>
          </div>
        </>
      )}
    </section>
  );
});

export default GSCPerformance;
