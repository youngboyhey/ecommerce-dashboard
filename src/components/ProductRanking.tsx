'use client';

import { memo, useMemo } from 'react';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

const MEDAL_GRADIENTS = {
  gold: 'from-amber-400 to-amber-600',
  silver: 'from-slate-300 to-slate-500',
  bronze: 'from-orange-400 to-orange-600',
  default: 'from-slate-500 to-slate-600',
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
      className="glass-card rounded-2xl p-6"
      aria-labelledby="product-ranking-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="product-ranking-title" className="text-lg font-semibold text-white">
              商品銷售排行
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">本週熱銷商品</p>
          </div>
        </div>
        <span className="badge badge-info">
          Top {rankedProducts.length}
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
          const gradientKey = isTopThree 
            ? (index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze')
            : 'default';
          
          return (
            <article 
              key={product.sku} 
              className="group"
              role="listitem"
            >
              <div className="flex items-center gap-4 mb-2">
                {/* Rank */}
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl glass-inner group-hover:scale-110 transition-transform duration-300 ${
                  isTopThree ? 'ring-1 ring-white/10' : ''
                }`}>
                  {isTopThree ? (
                    <span className="text-xl" role="img" aria-label={`第 ${index + 1} 名`}>
                      {MEDALS[index]}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-slate-500">#{index + 1}</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku}</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-base font-bold text-white font-mono-nums">
                    {formatCurrency(product.total_revenue)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium text-blue-400">{product.total_quantity}</span> 件
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div 
                className="ml-14 h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5"
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
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 glass-inner rounded-xl">
            <p className="text-2xl font-bold text-white font-mono-nums">
              {formatCurrency(cyberbizSummary.total_revenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">總營收</p>
          </div>
          <div className="text-center p-4 glass-inner rounded-xl">
            <p className="text-2xl font-bold text-blue-400 font-mono-nums">
              {cyberbizSummary.order_count}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">訂單數</p>
          </div>
          <div className="text-center p-4 glass-inner rounded-xl">
            <p className="text-2xl font-bold text-emerald-400 font-mono-nums">
              {formatCurrency(cyberbizSummary.aov)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">客單價</p>
          </div>
        </div>
      </div>
    </section>
  );
});

export default ProductRanking;
