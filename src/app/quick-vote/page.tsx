'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Quarterback {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  headshot_url: string | null;
  trust_score: number;
}

type SortOption = 'score-desc' | 'score-asc' | 'name' | 'team';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function getCooldownKey(qbId: number): string {
  return `qb-vote-cooldown-${qbId}`;
}

// Convert name to URL slug
function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function QuickVotePage() {
  const [quarterbacks, setQuarterbacks] = useState<Quarterback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('score-desc');
  const [votingId, setVotingId] = useState<number | null>(null);
  const [recentVotes, setRecentVotes] = useState<Record<number, 'more' | 'less'>>({});
  const [cooldownEnds, setCooldownEnds] = useState<Record<number, number>>({});
  const [timesLeft, setTimesLeft] = useState<Record<number, number>>({});

  // Check localStorage for existing cooldowns on mount
  useEffect(() => {
    const stored: Record<number, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('qb-vote-cooldown-')) {
        const qbId = parseInt(key.replace('qb-vote-cooldown-', ''), 10);
        const endTime = parseInt(localStorage.getItem(key) || '0', 10);
        if (endTime > Date.now()) {
          stored[qbId] = endTime;
        } else {
          localStorage.removeItem(key);
        }
      }
    }
    setCooldownEnds(stored);
  }, []);

  // Update countdown timers - matches VoteButtons approach exactly
  useEffect(() => {
    const activeCooldowns = Object.entries(cooldownEnds).filter(
      ([, endTime]) => endTime > Date.now()
    );

    if (activeCooldowns.length === 0) {
      setTimesLeft({});
      return;
    }

    const updateTimers = () => {
      const newTimesLeft: Record<number, number> = {};
      const newCooldownEnds: Record<number, number> = { ...cooldownEnds };
      let changed = false;

      for (const [qbIdStr, endTime] of Object.entries(cooldownEnds)) {
        const qbId = parseInt(qbIdStr, 10);
        const remaining = endTime - Date.now();

        if (remaining <= 0) {
          localStorage.removeItem(getCooldownKey(qbId));
          delete newCooldownEnds[qbId];
          changed = true;
        } else {
          newTimesLeft[qbId] = Math.ceil(remaining / 1000);
        }
      }

      setTimesLeft(newTimesLeft);
      if (changed) {
        setCooldownEnds(newCooldownEnds);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnds]);

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

    fetchQBs();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVote = async (qbId: number, direction: 'more' | 'less') => {
    if (cooldownEnds[qbId] && cooldownEnds[qbId] > Date.now()) return;

    setVotingId(qbId);

    try {
      const response = await fetch(`/api/qbs/${qbId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      if (!response.ok) {
        throw new Error('Vote failed');
      }

      const updatedQb = await response.json();

      setQuarterbacks(prev =>
        prev.map(qb => qb.id === qbId ? { ...qb, trust_score: updatedQb.trust_score } : qb)
      );

      // Set cooldown
      const endTime = Date.now() + COOLDOWN_MS;
      setCooldownEnds(prev => ({ ...prev, [qbId]: endTime }));
      localStorage.setItem(getCooldownKey(qbId), endTime.toString());

      setRecentVotes(prev => ({ ...prev, [qbId]: direction }));

      // Clear the visual feedback after 2 seconds
      setTimeout(() => {
        setRecentVotes(prev => {
          const newVotes = { ...prev };
          delete newVotes[qbId];
          return newVotes;
        });
      }, 2000);
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVotingId(null);
    }
  };

  const sortedQBs = [...quarterbacks].sort((a, b) => {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 skeleton rounded" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 skeleton rounded-xl" />
        ))}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quick Vote</h1>
          <p className="text-gray-400 text-sm mt-1">Rapidly rate all quarterbacks (5 min cooldown per QB)</p>
        </div>
        <Link
          href="/"
          className="text-[var(--accent-blue)] hover:underline text-sm"
        >
          ← Back to Cards View
        </Link>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors cursor-pointer"
        >
          <option value="score-desc">Highest Trust</option>
          <option value="score-asc">Lowest Trust</option>
          <option value="name">Name (A-Z)</option>
          <option value="team">Team (A-Z)</option>
        </select>
      </div>

      {/* QB List */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_100px_180px] gap-4 px-4 py-3 bg-[var(--card-border)] text-gray-400 text-sm font-medium">
          <div className="w-12"></div>
          <div>Player</div>
          <div className="text-center">Score</div>
          <div className="text-center">Vote</div>
        </div>

        {/* QB Rows */}
        <div className="divide-y divide-[var(--card-border)]">
          {sortedQBs.map((qb, index) => {
            const timeLeft = timesLeft[qb.id] || 0;
            const onCooldown = timeLeft > 0;

            return (
              <div
                key={qb.id}
                className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_100px_180px] gap-3 sm:gap-4 px-4 py-3 items-center transition-colors ${
                  recentVotes[qb.id] === 'more' ? 'bg-green-500/10' :
                  recentVotes[qb.id] === 'less' ? 'bg-red-500/10' : ''
                }`}
              >
                {/* Rank & Headshot */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6 text-right">{index + 1}</span>
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    <Image
                      src={qb.headshot_url || `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${qb.espn_id}.png&w=350&h=254&cb=1`}
                      alt={qb.name}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Name & Team */}
                <div className="min-w-0">
                  <Link href={`/qb/${nameToSlug(qb.name)}`} className="hover:text-[var(--accent-blue)] transition-colors">
                    <p className="font-semibold text-white truncate">{qb.name}</p>
                  </Link>
                  <p className="text-gray-500 text-sm">{qb.team}</p>
                </div>

                {/* Score - Hidden on mobile, shown inline with buttons */}
                <div className="hidden sm:flex justify-center">
                  <span className={`text-lg font-bold ${
                    qb.trust_score >= 70 ? 'text-green-400' :
                    qb.trust_score >= 50 ? 'text-yellow-400' :
                    qb.trust_score >= 30 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {Math.round(qb.trust_score)}
                  </span>
                </div>

                {/* Vote Buttons */}
                <div className="flex items-center gap-2 justify-end sm:justify-center">
                  {/* Mobile score */}
                  <span className={`sm:hidden text-sm font-bold mr-2 ${
                    qb.trust_score >= 70 ? 'text-green-400' :
                    qb.trust_score >= 50 ? 'text-yellow-400' :
                    qb.trust_score >= 30 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {Math.round(qb.trust_score)}
                  </span>

                  {onCooldown ? (
                    <span className="text-gray-500 text-xs font-mono">
                      {formatTime(timeLeft)}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVote(qb.id, 'less')}
                        disabled={votingId === qb.id}
                        className={`p-2 rounded-lg transition-all ${
                          votingId === qb.id ? 'opacity-50 cursor-not-allowed' :
                          'bg-red-500/20 hover:bg-red-500/40 text-red-400'
                        }`}
                        title="Trust Less"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleVote(qb.id, 'more')}
                        disabled={votingId === qb.id}
                        className={`p-2 rounded-lg transition-all ${
                          votingId === qb.id ? 'opacity-50 cursor-not-allowed' :
                          'bg-green-500/20 hover:bg-green-500/40 text-green-400'
                        }`}
                        title="Trust More"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
