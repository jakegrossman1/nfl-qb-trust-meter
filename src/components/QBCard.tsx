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

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Elite';
  if (score >= 65) return 'Trusted';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Shaky';
  if (score >= 20) return 'Risky';
  return 'Bust';
}

export default function QBCard({ id, name, team, espn_id, headshot_url, trust_score }: QBCardProps) {
  const score = Math.round(trust_score);
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

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
                  stroke={score >= 70 ? '#00d166' : score >= 50 ? '#fbbf24' : score >= 30 ? '#fb923c' : '#ff4444'}
                  strokeWidth="3"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${scoreColor}`}>{score}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</span>
            <p className="text-xs text-gray-500">Trust Score</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
