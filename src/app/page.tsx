'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QBCard from '@/components/QBCard';

interface Quarterback {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  headshot_url: string | null;
  trust_score: number;
}

interface Mover extends Quarterback {
  movement: number;
}

type SortOption = 'score-desc' | 'score-asc' | 'name' | 'team';

export default function Home() {
  const [quarterbacks, setQuarterbacks] = useState<Quarterback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('score-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [risers, setRisers] = useState<Mover[]>([]);
  const [fallers, setFallers] = useState<Mover[]>([]);

  useEffect(() => {
    const fetchQBs = async () => {
      try {
        const response = await fetch('/api/qbs');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setQuarterbacks(data);
      } catch (err) {
        setError('Failed to load quarterbacks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchMovers = async () => {
      try {
        const response = await fetch('/api/qbs/movers');
        if (response.ok) {
          const data = await response.json();
          setRisers(data.risers || []);
          setFallers(data.fallers || []);
        }
      } catch (err) {
        console.error('Failed to load movers:', err);
      }
    };

    fetchQBs();
    fetchMovers();
  }, []);

  const sortedAndFilteredQBs = quarterbacks
    .filter((qb) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        qb.name.toLowerCase().includes(query) ||
        qb.team.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score-desc':
          return b.trust_score - a.trust_score;
        case 'score-asc':
          return a.trust_score - b.trust_score;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'team':
          return a.team.localeCompare(b.team);
        default:
          return 0;
      }
    });

  // Calculate some stats
  const topQB = quarterbacks.length > 0
    ? [...quarterbacks].sort((a, b) => b.trust_score - a.trust_score)[0]
    : null;
  const bottomQB = quarterbacks.length > 0
    ? [...quarterbacks].sort((a, b) => a.trust_score - b.trust_score)[0]
    : null;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 skeleton rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards and Movers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topQB && (
          <Link href={`/qb/${topQB.id}`} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 hover:border-green-500/50 transition-colors">
            <p className="text-gray-400 text-sm">Most Trusted</p>
            <p className="text-lg font-bold text-green-400">{topQB.name}</p>
            <p className="text-sm text-gray-500">{Math.round(topQB.trust_score)} points</p>
          </Link>
        )}
        {bottomQB && (
          <Link href={`/qb/${bottomQB.id}`} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 hover:border-red-500/50 transition-colors">
            <p className="text-gray-400 text-sm">Least Trusted</p>
            <p className="text-lg font-bold text-red-400">{bottomQB.name}</p>
            <p className="text-sm text-gray-500">{Math.round(bottomQB.trust_score)} points</p>
          </Link>
        )}

        {/* Risers Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          <p className="text-green-400 text-sm font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Risers (7 days)
          </p>
          <div className="mt-2 space-y-1">
            {risers.length > 0 ? risers.map((qb) => (
              <Link key={qb.id} href={`/qb/${qb.id}`} className="flex items-center justify-between text-sm hover:text-green-400 transition-colors">
                <span className="text-white truncate">{qb.name}</span>
                <span className="text-green-400 font-medium ml-2">+{qb.movement.toFixed(1)}</span>
              </Link>
            )) : (
              <p className="text-gray-500 text-sm">No risers</p>
            )}
          </div>
        </div>

        {/* Fallers Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          <p className="text-red-400 text-sm font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Fallers (7 days)
          </p>
          <div className="mt-2 space-y-1">
            {fallers.length > 0 ? fallers.map((qb) => (
              <Link key={qb.id} href={`/qb/${qb.id}`} className="flex items-center justify-between text-sm hover:text-red-400 transition-colors">
                <span className="text-white truncate">{qb.name}</span>
                <span className="text-red-400 font-medium ml-2">{qb.movement.toFixed(1)}</span>
              </Link>
            )) : (
              <p className="text-gray-500 text-sm">No fallers</p>
            )}
          </div>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors cursor-pointer"
          >
            <option value="score-desc">Highest Trust</option>
            <option value="score-asc">Lowest Trust</option>
            <option value="name">Name (A-Z)</option>
            <option value="team">Team (A-Z)</option>
          </select>
          <Link
            href="/quick-vote"
            className="px-4 py-3 bg-[var(--accent-blue)] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Vote
          </Link>
        </div>
      </div>

      {/* QB Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedAndFilteredQBs.map((qb) => (
          <QBCard
            key={qb.id}
            id={qb.id}
            name={qb.name}
            team={qb.team}
            espn_id={qb.espn_id}
            headshot_url={qb.headshot_url}
            trust_score={qb.trust_score}
          />
        ))}
      </div>

      {sortedAndFilteredQBs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No quarterbacks found matching your search.</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Trust Level Guide</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-gray-300">80-100: Elite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 opacity-70" />
            <span className="text-gray-300">65-79: Trusted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-gray-300">50-64: Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400" />
            <span className="text-gray-300">35-49: Shaky</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-gray-300">0-34: Risky/Bust</span>
          </div>
        </div>
      </div>
    </div>
  );
}
