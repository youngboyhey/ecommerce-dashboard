'use client';

import { ReactNode, useEffect, useRef, useCallback, useState } from 'react';

/**
 * 共用的圖表 Tooltip 樣式設定
 * 用於移除 Recharts 預設的黑框
 */
export const tooltipWrapperStyle: React.CSSProperties = {
  outline: 'none',
  border: 'none',
  boxShadow: 'none',
  background: 'transparent',
};

export const tooltipContentStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  padding: 0,
  background: 'transparent',
};

/**
 * 共用的 Tooltip 內容容器樣式
 */
export const tooltipContainerClass = 
  'bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100/50';

/**
 * 手機版 Tooltip 關閉處理 Hook
 * 偵測點擊圖表外部時關閉 tooltip
 */
export function useTooltipDismiss(containerRef: React.RefObject<HTMLElement | null>) {
  const [activeTooltip, setActiveTooltip] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 如果點擊的是圖表內部，讓 Recharts 處理
      // 這裡我們不需要做任何事，Recharts 會自動更新 tooltip
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // 點擊外部 - 觸發一個空的 mouseleave 事件來關閉 tooltip
        const chart = containerRef.current.querySelector('.recharts-wrapper');
        if (chart) {
          chart.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }
      }
    };

    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [containerRef]);

  return { activeTooltip, setActiveTooltip };
}
