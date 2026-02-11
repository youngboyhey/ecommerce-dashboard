'use client';

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
  ResponsiveContainer,
  Legend
} from 'recharts';
import { mockReportData } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';

export default function AudienceAnalysis() {
  const { meta_audience } = mockReportData;

  // Gender Data for Pie Chart
  const genderData = meta_audience.gender.map(g => ({
    name: g.gender === 'male' ? '男性' : g.gender === 'female' ? '女性' : '未知',
    value: g.spend,
    purchases: g.purchases,
    clicks: g.clicks
  }));

  // Age Data for Bar Chart
  const ageData = meta_audience.age.map(a => ({
    age: a.age_range,
    spend: a.spend,
    purchases: a.purchases,
    clicks: a.clicks,
    ctr: (a.clicks / a.impressions * 100).toFixed(2)
  }));

  const GENDER_COLORS = ['#3B82F6', '#EC4899', '#9CA3AF'];
  const AGE_COLORS = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'];

  const CustomGenderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">花費: {formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-600">購買: {data.purchases} 次</p>
          <p className="text-sm text-gray-600">點擊: {data.clicks} 次</p>
        </div>
      );
    }
    return null;
  };

  const CustomAgeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900 mb-1">{label} 歲</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === '花費' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Find best performing age group
  const bestAge = ageData.reduce((prev, current) => 
    (current.purchases > prev.purchases) ? current : prev
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">👥 受眾分析</h2>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          最佳受眾: {bestAge.age} 歲
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-4 text-center">性別分佈</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {genderData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={GENDER_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomGenderTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Gender Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((g, i) => (
              <div key={g.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GENDER_COLORS[i] }} />
                <span className="text-xs text-gray-600">{g.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Age Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-4 text-center">年齡分佈</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis 
                dataKey="age" 
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomAgeTooltip />} />
              <Bar dataKey="spend" name="花費" radius={[4, 4, 0, 0]}>
                {ageData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={AGE_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Age Performance Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-500 font-medium">年齡</th>
              <th className="text-right py-2 text-gray-500 font-medium">花費</th>
              <th className="text-right py-2 text-gray-500 font-medium">點擊</th>
              <th className="text-right py-2 text-gray-500 font-medium">購買</th>
              <th className="text-right py-2 text-gray-500 font-medium">轉換率</th>
            </tr>
          </thead>
          <tbody>
            {ageData.map((row) => (
              <tr key={row.age} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-900">{row.age}</td>
                <td className="py-2 text-right text-gray-600">{formatCurrency(row.spend)}</td>
                <td className="py-2 text-right text-gray-600">{row.clicks}</td>
                <td className="py-2 text-right">
                  <span className={`font-medium ${row.purchases > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {row.purchases}
                  </span>
                </td>
                <td className="py-2 text-right text-gray-600">
                  {row.clicks > 0 ? ((row.purchases / row.clicks) * 100).toFixed(2) : '0.00'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
