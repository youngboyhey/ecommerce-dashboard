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
  Hash
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

// 預設模擬數據
const defaultSummary: GSCSummary = {
  totalImpressions: 12580,
  totalClicks: 342,
  avgCtr: 2.72,
  avgPosition: 18.5,
  impressionsChange: 8.3,
  clicksChange: 12.5,
};

const defaultKeywords: KeywordData[] = [
  { keyword: 'liqui moly', impressions: 2340, clicks: 156, ctr: 6.67, position: 3.2, positionChange: 0.5 },
  { keyword: '車用香氛', impressions: 1850, clicks: 89, ctr: 4.81, position: 5.8, positionChange: -1.2 },
  { keyword: '汽車香氛磚', impressions: 1420, clicks: 45, ctr: 3.17, position: 8.3, positionChange: 0.8 },
  { keyword: '德國機油品牌', impressions: 980, clicks: 23, ctr: 2.35, position: 12.1, positionChange: -2.1 },
  { keyword: 'liqui moly 台灣', impressions: 756, clicks: 52, ctr: 6.88, position: 2.1, positionChange: 0.3 },
  { keyword: '車用芳香劑推薦', impressions: 645, clicks: 18, ctr: 2.79, position: 15.4 },
  { keyword: '防鼠噴劑 汽車', impressions: 520, clicks: 12, ctr: 2.31, position: 9.7 },
  { keyword: '汽車精品', impressions: 480, clicks: 8, ctr: 1.67, position: 22.3 },
  { keyword: '車內除臭', impressions: 420, clicks: 15, ctr: 3.57, position: 11.2 },
  { keyword: 'car freshener', impressions: 380, clicks: 6, ctr: 1.58, position: 28.5 },
];

const defaultPages: PageData[] = [
  { page: '/products/air-freshener', impressions: 3250, clicks: 145, ctr: 4.46, position: 6.2 },
  { page: '/', impressions: 2840, clicks: 98, ctr: 3.45, position: 8.5 },
  { page: '/products/anti-rodent-spray', impressions: 1560, clicks: 42, ctr: 2.69, position: 12.3 },
  { page: '/brand/liqui-moly', impressions: 1280, clicks: 68, ctr: 5.31, position: 4.8 },
  { page: '/blog/car-care-tips', impressions: 950, clicks: 25, ctr: 2.63, position: 15.7 },
  { page: '/products/engine-oil', impressions: 720, clicks: 18, ctr: 2.50, position: 18.2 },
  { page: '/about', impressions: 480, clicks: 8, ctr: 1.67, position: 25.3 },
  { page: '/contact', impressions: 320, clicks: 5, ctr: 1.56, position: 32.1 },
];

type TabType = 'keywords' | 'pages';

const GSCPerformance = memo(function GSCPerformance({
  summary: propSummary,
  keywords: propKeywords,
  pages: propPages,
  className,
}: GSCPerformanceProps) {
  // 使用傳入的 props，只有在完全沒有傳入時才使用預設值
  const summary = propSummary || defaultSummary;
  const keywords = propKeywords && propKeywords.length > 0 ? propKeywords : defaultKeywords;
  const pages = propPages && propPages.length > 0 ? propPages : defaultPages;
  const [activeTab, setActiveTab] = useState<TabType>('keywords');
  const [sortBy, setSortBy] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 排序關鍵字
  const sortedKeywords = useMemo(() => {
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

  return (
    <section 
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100 p-6",
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
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          開啟 GSC <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 總覽指標 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs font-medium text-blue-600 mb-1">總曝光數</p>
          <p className="text-2xl font-bold text-blue-900">{summary.totalImpressions.toLocaleString()}</p>
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
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
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
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs font-medium text-purple-600 mb-1">平均 CTR</p>
          <p className="text-2xl font-bold text-purple-900">{summary.avgCtr.toFixed(2)}%</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs font-medium text-amber-600 mb-1">平均排名</p>
          <p className="text-2xl font-bold text-amber-900">{summary.avgPosition.toFixed(1)}</p>
        </div>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('keywords')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'keywords'
              ? "border-blue-600 text-blue-600"
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
              ? "border-blue-600 text-blue-600"
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
                  <td className="text-right py-3 px-2 font-medium text-blue-600">
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
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-5">{index + 1}</span>
                      <span className="font-medium text-gray-900 truncate max-w-[200px]" title={item.page}>
                        {item.page}
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-gray-700">
                    {item.impressions.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2 font-medium text-blue-600">
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
    </section>
  );
});

export default GSCPerformance;
