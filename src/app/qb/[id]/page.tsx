'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import TrustGauge from '@/components/TrustGauge';
import TrustHistoryChart from '@/components/TrustHistoryChart';
import VoteButtons from '@/components/VoteButtons';

interface Quarterback {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  headshot_url: string | null;
  trust_score: number;
  recent_vote_count: number;
}

interface TrustSnapshot {
  id: number;
  qb_id: number;
  score: number;
  snapshot_date: string;
}

export default function QBDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [qb, setQb] = useState<Quarterback | null>(null);
  const [history, setHistory] = useState<TrustSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreUpdated, setScoreUpdated] = useState(false);
  const [voteFlash, setVoteFlash] = useState<'more' | 'less' | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [qbResponse, historyResponse] = await Promise.all([
          fetch(`/api/qbs/${id}`),
          fetch(`/api/qbs/${id}/history?days=30`),
        ]);

        if (!qbResponse.ok) {
          throw new Error('Quarterback not found');
        }

        const qbData = await qbResponse.json();
        const historyData = await historyResponse.json();

        setQb(qbData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleVote = async (direction: 'more' | 'less') => {
    if (!qb) return;

    const response = await fetch(`/api/qbs/${qb.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });

    if (!response.ok) {
      throw new Error('Vote failed');
    }

    const updatedQb = await response.json();
    setQb(updatedQb);

    // Trigger score animation
    setScoreUpdated(true);
    setTimeout(() => setScoreUpdated(false), 300);

    // Trigger vote flash on card
    setVoteFlash(direction);
    setTimeout(() => setVoteFlash(null), 500);

    // Refresh history
    const historyResponse = await fetch(`/api/qbs/${qb.id}/history?days=30`);
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      setHistory(historyData);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-8 w-32 skeleton rounded" />
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-48 skeleton rounded-full mx-auto md:mx-0" />
          <div className="flex-1 space-y-4">
            <div className="h-10 w-64 skeleton rounded" />
            <div className="h-6 w-48 skeleton rounded" />
            <div className="h-40 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !qb) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error || 'Quarterback not found'}</p>
        <Link
          href="/"
          className="mt-4 inline-block px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to All QBs
      </Link>

      {/* QB Header */}
      <div className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 md:p-8 transition-colors duration-300 ${
        voteFlash === 'more' ? 'bg-green-500/20 border-green-500/50' :
        voteFlash === 'less' ? 'bg-red-500/20 border-red-500/50' : ''
      }`}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Headshot */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 ring-4 ring-[var(--card-border)]">
            <Image
              src={qb.headshot_url || `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${qb.espn_id}.png&w=350&h=254&cb=1`}
              alt={qb.name}
              fill
              className="object-cover object-top"
              unoptimized
              priority
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{qb.name}</h1>
            <p className="text-xl text-gray-400 mt-1">{qb.team}</p>

            {/* Trust Gauge */}
            <div className="mt-6 flex flex-col items-center md:items-start">
              <div className={scoreUpdated ? 'score-updated' : ''}>
                <TrustGauge score={qb.trust_score} size={280} />
              </div>
              {/* Vote count transparency */}
              <p className="text-gray-500 text-sm mt-2">
                Based on {qb.recent_vote_count} vote{qb.recent_vote_count !== 1 ? 's' : ''} in the last 7 days
              </p>
            </div>
          </div>
        </div>

        {/* Vote Buttons */}
        <div className="mt-8">
          <VoteButtons qbId={qb.id} onVote={handleVote} />
        </div>
      </div>

      {/* Trust History Chart */}
      <TrustHistoryChart history={history} currentScore={qb.trust_score} />

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">About Trust Score</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            The Trust Score uses time-weighted voting with a Bayesian prior.
            Recent votes count more than older ones (7-day half-life), and a
            baseline of 20 virtual votes at 50% prevents wild swings with few votes.
            Vote once every 5 minutes per QB.
          </p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Trust Level</span>
              <span className={`font-semibold ${
                qb.trust_score >= 70 ? 'text-green-400' :
                qb.trust_score >= 50 ? 'text-yellow-400' :
                qb.trust_score >= 30 ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {qb.trust_score >= 80 ? 'Elite' :
                 qb.trust_score >= 60 ? 'Trusted' :
                 qb.trust_score >= 40 ? 'Average' :
                 qb.trust_score >= 20 ? 'Shaky' : 'Risky/Bust'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Score</span>
              <span className="text-white font-semibold">{Math.round(qb.trust_score * 10) / 10}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recent Votes (7 days)</span>
              <span className="text-white">{qb.recent_vote_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Share This QB</h3>
        <p className="text-gray-400 text-sm mb-4">
          Let others know what you think about {qb.name}!
        </p>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${qb.name} Trust Score`,
                text: `${qb.name} has a trust score of ${Math.round(qb.trust_score)} on NFL QB Trust Meter!`,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }
          }}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          Share Link
        </button>
      </div>
    </div>
  );
}
