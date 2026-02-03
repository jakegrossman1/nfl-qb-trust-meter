'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamically import Recharts with no SSR to avoid hydration issues
const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const ReferenceLine = dynamic(
  () => import('recharts').then((mod) => mod.ReferenceLine),
  { ssr: false }
);

interface TrustSnapshot {
  id: number;
  qb_id: number;
  score: number;
  snapshot_date: string;
}

interface TrustHistoryChartProps {
  history: TrustSnapshot[];
  currentScore: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TrustHistoryChart({ history, currentScore }: TrustHistoryChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return [];

    const chartData = history.map((snapshot) => ({
      date: formatDate(snapshot.snapshot_date),
      score: Math.round(snapshot.score * 10) / 10,
      fullDate: snapshot.snapshot_date,
    }));

    // Add current score if it's different from the last snapshot
    if (chartData.length > 0 && chartData[chartData.length - 1].score !== currentScore) {
      chartData.push({
        date: 'Now',
        score: Math.round(currentScore * 10) / 10,
        fullDate: new Date().toISOString().split('T')[0],
      });
    }

    return chartData;
  }, [history, currentScore]);

  const { minScore, maxScore } = useMemo(() => {
    if (data.length === 0) return { minScore: 0, maxScore: 100 };
    return {
      minScore: Math.max(0, Math.min(...data.map((d) => d.score)) - 10),
      maxScore: Math.min(100, Math.max(...data.map((d) => d.score)) + 10),
    };
  }, [data]);

  // If no history, show a message
  if (!history || history.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trust History</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          <p>No history available yet. Vote to start tracking!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trust History</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d9bf0" stopOpacity={1} />
                <stop offset="95%" stopColor="#1d9bf0" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              domain={[minScore, maxScore]}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                color: 'white',
              }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value) => [`${value}`, 'Trust Score']}
            />
            <ReferenceLine
              y={50}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{ value: 'Avg', fill: '#6b7280', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ fill: '#1d9bf0', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d9bf0', stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
