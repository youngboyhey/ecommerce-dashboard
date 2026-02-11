'use client';

import { memo, useMemo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

const MEDAL_GRADIENTS = {
  gold: 'from-amber-400 to-amber-500',
  silver: 'from-gray-300 to-gray-400',
  bronze: 'from-orange-400 to-orange-500',
  default: 'from-indigo-400 to-indigo-500',
};

interface ProductData {
  product_name: string;
  variant: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

interface SummaryData {
  order_count: number;
  total_revenue: number;
  aov: number;
  new_members: number;
  product_ranking: ProductData[];
}

interface ProductRankingProps {
  products?: ProductData[];
  summary?: SummaryData;
}

const ProductRanking = memo(function ProductRanking({ products, summary }: ProductRankingProps) {
  const product_ranking = products || mockReportData.cyberbiz.product_ranking;
  const cyberbizSummary = summary || mockReportData.cyberbiz;

  const rankedProducts = useMemo(() => 
    product_ranking
      .filter(p => p.total_revenue > 0)
      .sort((a, b) => b.total_revenue - a.total_revenue),
    [product_ranking]
  );

  const maxRevenue = useMemo(() => 
    Math.max(...rankedProducts.map(p => p.total_revenue)),
    [rankedProducts]
  );

  return (
    <section 
      className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="product-ranking-title"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 id="product-ranking-title" className="text-base sm:text-lg font-semibold text-gray-900">
              商品銷售排行
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">本週熱銷商品</p>
          </div>
        </div>
        <span className="badge badge-info text-[10px] sm:text-xs">
          Top {rankedProducts.length}
        </span>
      </div>

      <div 
        className="space-y-3 sm:space-y-5" 
        role="list" 
        aria-label="商品銷售排行榜"
      >
        {rankedProducts.map((product, index) => {
          const widthPercent = (product.total_revenue / maxRevenue) * 100;
          const isTopThree = index < 3;
          const gradientKey = isTopThree 
            ? (index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze')
            : 'default';
          
          return (
            <article 
              key={product.sku} 
              className="group"
              role="listitem"
            >
              <div className="flex items-center gap-2 sm:gap-4 mb-1.5 sm:mb-2">
                {/* Rank */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 group-hover:scale-110 transition-transform duration-300 ${
                  isTopThree ? 'ring-1 ring-amber-200' : ''
                }`}>
                  {isTopThree ? (
                    <span className="text-base sm:text-xl" role="img" aria-label={`第 ${index + 1} 名`}>
                      {MEDALS[index]}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-gray-400">#{index + 1}</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                    {product.product_name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">SKU: {product.sku}</p>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm sm:text-base font-bold text-gray-900 font-mono-nums">
                    {formatCurrency(product.total_revenue)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                    <span className="font-medium text-indigo-600">{product.total_quantity}</span> 件
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div 
                className="ml-10 sm:ml-14 h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={widthPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${product.product_name} 營收佔比 ${widthPercent.toFixed(0)}%`}
              >
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${MEDAL_GRADIENTS[gradientKey]} transition-all duration-700 ease-out relative overflow-hidden`}
                  style={{ width: `${widthPercent}%` }}
                >
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-4 bg-indigo-50 rounded-lg sm:rounded-xl border border-indigo-100">
            <p className="text-sm sm:text-2xl font-bold text-indigo-600 font-mono-nums truncate">
              {formatCurrency(cyberbizSummary.total_revenue)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium">總營收</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-purple-50 rounded-lg sm:rounded-xl border border-purple-100">
            <p className="text-sm sm:text-2xl font-bold text-purple-600 font-mono-nums">
              {cyberbizSummary.order_count}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium">訂單數</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl border border-emerald-100">
            <p className="text-sm sm:text-2xl font-bold text-emerald-600 font-mono-nums truncate">
              {formatCurrency(cyberbizSummary.aov)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium">客單價</p>
          </div>
        </div>
      </div>
    </section>
  );
});

export default ProductRanking;
