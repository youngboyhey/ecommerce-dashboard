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
  if (options.length === 0 || !selected) return null;

  return (
    <div className="relative inline-block">
      <select
        value={selected.startDate}
        onChange={(e) => {
          const week = options.find(w => w.startDate === e.target.value);
          if (week) onChange(week);
        }}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 pr-7 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer max-w-[120px] sm:max-w-none truncate"
      >
        {options.map((option, index) => (
          <option key={option.startDate} value={option.startDate}>
            {index === 0 ? '本週 ' : index === 1 ? '上週 ' : ''}{option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
    </div>
  );
});

export default WeekSelector;
