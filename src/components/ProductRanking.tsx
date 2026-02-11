'use client';

import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';

export default function ProductRanking() {
  const { product_ranking } = mockReportData.cyberbiz;

  // Filter out zero revenue products and sort by revenue
  const rankedProducts = product_ranking
    .filter(p => p.total_revenue > 0)
    .sort((a, b) => b.total_revenue - a.total_revenue);

  const maxRevenue = Math.max(...rankedProducts.map(p => p.total_revenue));

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">🏆 商品銷售排行</h2>
        <span className="text-sm text-gray-500">
          Top {rankedProducts.length} 商品
        </span>
      </div>

      <div className="space-y-4">
        {rankedProducts.map((product, index) => {
          const widthPercent = (product.total_revenue / maxRevenue) * 100;
          
          return (
            <div key={product.sku} className="group">
              <div className="flex items-center gap-3 mb-2">
                {/* Rank */}
                <div className="w-8 text-center">
                  {index < 3 ? (
                    <span className="text-xl">{medals[index]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                  <p className="text-xs text-gray-400">{product.total_quantity} 件</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="ml-11 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                    index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' :
                    'bg-gradient-to-r from-blue-300 to-blue-400'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(mockReportData.cyberbiz.total_revenue)}
            </p>
            <p className="text-xs text-gray-500">總營收</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {mockReportData.cyberbiz.order_count}
            </p>
            <p className="text-xs text-gray-500">訂單數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(mockReportData.cyberbiz.aov)}
            </p>
            <p className="text-xs text-gray-500">客單價</p>
          </div>
        </div>
      </div>
    </div>
  );
}
