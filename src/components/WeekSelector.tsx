'use client';

import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { WeekOption } from '@/lib/useWeeklyData';

interface WeekSelectorProps {
  options: WeekOption[];
  selected: WeekOption | null;
  onChange: (week: WeekOption) => void;
}

const WeekSelector = memo(function WeekSelector({ 
  options, 
  selected, 
  onChange 
}: WeekSelectorProps) {
  // 沒有資料時顯示 loading 狀態
  if (options.length === 0 || !selected) {
    return (
      <div className="relative inline-block">
        <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 pr-7 sm:pr-10 text-xs sm:text-sm font-medium text-gray-400 animate-pulse min-w-[100px] sm:min-w-[140px]">
          載入中...
        </div>
        <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-300 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={selected.startDate}
        onChange={(e) => {
          const week = options.find(w => w.startDate === e.target.value);
          if (week) onChange(week);
        }}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer min-w-[130px] sm:min-w-[160px] active:bg-gray-50"
        style={{ fontSize: '16px' }} // 防止 iOS 自動縮放
      >
        {options.map((option, index) => (
          <option key={option.startDate} value={option.startDate}>
            {index === 0 ? '本週 ' : index === 1 ? '上週 ' : ''}{option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
});

export default WeekSelector;
