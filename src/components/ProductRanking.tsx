'use client';

import { memo, useMemo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

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
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      aria-labelledby="product-ranking-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="product-ranking-title" className="text-lg font-semibold text-gray-900">
          🏆 商品銷售排行
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Top {rankedProducts.length} 商品
        </span>
      </div>

      <div 
        className="space-y-5" 
        role="list" 
        aria-label="商品銷售排行榜"
      >
        {rankedProducts.map((product, index) => {
          const widthPercent = (product.total_revenue / maxRevenue) * 100;
          const isTopThree = index < 3;
          const barColor = isTopThree 
            ? CHART_COLORS.medals[index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze']
            : CHART_COLORS.medals.default;
          
          return (
            <article 
              key={product.sku} 
              className="group"
              role="listitem"
            >
              <div className="flex items-center gap-4 mb-2">
                {/* Rank */}
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors">
                  {isTopThree ? (
                    <span className="text-xl" role="img" aria-label={`第 ${index + 1} 名`}>
                      {MEDALS[index]}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(product.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium text-blue-600">{product.total_quantity}</span> 件
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div 
                className="ml-14 h-2.5 bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={widthPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${product.product_name} 營收佔比 ${widthPercent.toFixed(0)}%`}
              >
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(cyberbizSummary.total_revenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">總營收</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">
              {cyberbizSummary.order_count}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">訂單數</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(cyberbizSummary.aov)}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">客單價</p>
          </div>
        </div>
      </div>
    </section>
  );
});

export default ProductRanking;
