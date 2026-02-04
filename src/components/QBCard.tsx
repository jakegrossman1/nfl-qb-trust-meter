'use client';

import Image from 'next/image';
import Link from 'next/link';

interface QBCardProps {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  headshot_url?: string | null;
  trust_score: number;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Elite';
  if (score >= 60) return 'Trusted';
  if (score >= 40) return 'Average';
  if (score >= 20) return 'Shaky';
  return 'Risky/Bust';
}

// Interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get interpolated color based on score (0-100)
function getInterpolatedColor(score: number): string {
  const colors = [
    { score: 0, color: '#991b1b' },   // Dark red
    { score: 20, color: '#dc2626' },  // Red
    { score: 40, color: '#f97316' },  // Orange
    { score: 60, color: '#eab308' },  // Yellow
    { score: 80, color: '#22c55e' },  // Green
    { score: 100, color: '#22c55e' }, // Green
  ];

  // Find the two colors to interpolate between
  for (let i = 0; i < colors.length - 1; i++) {
    if (score >= colors[i].score && score <= colors[i + 1].score) {
      const range = colors[i + 1].score - colors[i].score;
      const factor = (score - colors[i].score) / range;
      return interpolateColor(colors[i].color, colors[i + 1].color, factor);
    }
  }

  return colors[colors.length - 1].color;
}

export default function QBCard({ id, name, team, espn_id, headshot_url, trust_score }: QBCardProps) {
  const score = Math.round(trust_score);
  const scoreLabel = getScoreLabel(score);
  const barColor = getInterpolatedColor(score);

  // Use headshot_url from DB, fallback to ESPN CDN
  const imageUrl = headshot_url || `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${espn_id}.png&w=96&h=70&cb=1`;

  return (
    <Link href={`/qb/${id}`}>
      <div className="qb-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover object-top"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            <p className="text-sm text-gray-400 truncate">{team}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--card-border)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={barColor}
                  strokeWidth="3"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: barColor }}>{score}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium" style={{ color: barColor }}>{scoreLabel}</span>
            <p className="text-xs text-gray-500">Trust Score</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
