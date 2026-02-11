'use client';

import { memo, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { Users } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipPayload = any;

// 藍紫色調色系
const GENDER_COLORS = ['#6366F1', '#EC4899', '#9CA3AF'];
const AGE_COLORS = ['#6366F1', '#818CF8', '#A78BFA', '#C4B5FD', '#67E8F9', '#10B981'];

interface AgeData {
  age_range: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

interface GenderData {
  gender: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

interface MetaAudienceData {
  age: AgeData[];
  gender: GenderData[];
  region?: Array<{ region: string; spend: number; impressions: number; clicks: number; purchases: number }>;
}

interface AudienceAnalysisProps {
  data?: MetaAudienceData;
}

// 白色主題 Tooltip
const GenderTooltip = memo(function GenderTooltip({ 
  active, 
  payload 
}: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as {
    name: string;
    value: number;
    purchases: number;
    clicks: number;
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-900 mb-3 text-sm">{data.name}</p>
      <div className="space-y-2 text-xs">
        <p className="text-gray-500">花費: <span className="font-medium text-gray-900">{formatCurrency(data.value)}</span></p>
        <p className="text-gray-500">購買: <span className="font-medium text-emerald-600">{data.purchases} 次</span></p>
        <p className="text-gray-500">點擊: <span className="font-medium text-indigo-600">{data.clicks} 次</span></p>
      </div>
    </div>
  );
});

const AgeTooltip = memo(function AgeTooltip({ 
  active, 
  payload, 
  label 
}: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-900 mb-3 text-sm">{label} 歲</p>
      {payload.map((entry: TooltipPayload, index: number) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.name === '花費' ? formatCurrency(entry.value as number) : entry.value}
        </p>
      ))}
    </div>
  );
});

const AudienceAnalysis = memo(function AudienceAnalysis({ data: propData }: AudienceAnalysisProps) {
  const meta_audience = propData || mockReportData.meta_audience;

  const genderData = useMemo(() => meta_audience.gender.map(g => ({
    name: g.gender === 'male' ? '男性' : g.gender === 'female' ? '女性' : '未知',
    value: g.spend,
    purchases: g.purchases,
    clicks: g.clicks
  })), [meta_audience.gender]);

  const ageData = useMemo(() => meta_audience.age.map(a => ({
    age: a.age_range,
    spend: a.spend,
    purchases: a.purchases,
    clicks: a.clicks,
    ctr: (a.clicks / a.impressions * 100).toFixed(2)
  })), [meta_audience.age]);

  const bestAge = useMemo(() => 
    ageData.length > 0 
      ? ageData.reduce((prev, current) => 
          (current.purchases > prev.purchases) ? current : prev
        )
      : null
  , [ageData]);

  const renderPieLabel = ({ name, percent }: { name?: string; percent?: number }) => 
    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`;

  return (
    <section 
      className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100"
      aria-labelledby="audience-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="audience-title" className="text-lg font-semibold text-gray-900">
              受眾分析
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Meta 廣告受眾表現</p>
          </div>
        </div>
        <span className="badge badge-info">
          🎯 最佳: {bestAge?.age ?? 'N/A'} 歲
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
            性別分佈
          </h3>
          <div aria-label="性別分佈圓餅圖">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {genderData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={GENDER_COLORS[index]} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<GenderTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gender Legend */}
          <div className="flex justify-center gap-4 mt-3">
            {genderData.map((g, i) => (
              <div key={g.name} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: GENDER_COLORS[i] }} 
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-gray-600">{g.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Age Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
            年齡分佈
          </h3>
          <div aria-label="年齡分佈長條圖">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#F3F4F6" 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="age" 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<AgeTooltip />} />
                <Bar dataKey="spend" name="花費" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {ageData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={AGE_COLORS[index % AGE_COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Age Performance Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="年齡層績效數據表">
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="text-left py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">年齡</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">花費</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">點擊</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">購買</th>
              <th scope="col" className="text-right py-3 px-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">轉換率</th>
            </tr>
          </thead>
          <tbody>
            {ageData.map((row) => (
              <tr 
                key={row.age} 
                className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${row.age === bestAge?.age ? 'bg-indigo-50/50' : ''}`}
              >
                <td className="py-3 px-2">
                  <span className={`font-medium ${row.age === bestAge?.age ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {row.age}
                    {row.age === bestAge?.age && <span className="ml-1">⭐</span>}
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-gray-700 font-medium font-mono-nums">{formatCurrency(row.spend)}</td>
                <td className="text-right py-3 px-2 text-gray-500 font-mono-nums">{row.clicks}</td>
                <td className="text-right py-3 px-2">
                  <span className={`font-bold font-mono-nums ${row.purchases > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                    {row.purchases}
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.clicks > 0 && (row.purchases / row.clicks) > 0.01 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {row.clicks > 0 ? ((row.purchases / row.clicks) * 100).toFixed(2) : '0.00'}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export default AudienceAnalysis;
