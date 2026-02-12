'use client';

import { memo } from 'react';
import { TrendingUp, Target, Globe } from 'lucide-react';

export type TabId = 'revenue' | 'meta-ads' | 'traffic';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  emoji: string;
}

const tabs: Tab[] = [
  { 
    id: 'revenue', 
    label: '營收數據', 
    emoji: '💰',
    icon: <TrendingUp className="w-4 h-4" />
  },
  { 
    id: 'meta-ads', 
    label: 'Meta廣告分析', 
    emoji: '📊',
    icon: <Target className="w-4 h-4" />
  },
  { 
    id: 'traffic', 
    label: '網站來源分析', 
    emoji: '🌐',
    icon: <Globe className="w-4 h-4" />
  },
];

interface DashboardTabsProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const DashboardTabs = memo(function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
  return (
    <div className="mb-4 sm:mb-6">
      {/* Desktop Tabs */}
      <div className="hidden sm:flex gap-2 p-1.5 rounded-2xl bg-gray-100/80 border border-gray-200/50 backdrop-blur-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                text-sm font-medium transition-all duration-300 ease-out
                ${isActive
                  ? 'bg-white text-gray-900 shadow-lg shadow-gray-200/50 border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
            >
              <span className="text-lg">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Tabs - 橫向滾動 */}
      <div className="sm:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
        <div className="flex gap-2 p-1 rounded-xl bg-gray-100/80 border border-gray-200/50 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap
                  text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-white text-gray-900 shadow-md border border-gray-100'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
                role="tab"
                aria-selected={isActive}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default DashboardTabs;
