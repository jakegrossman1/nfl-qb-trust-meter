'use client';

import { useState, useEffect } from 'react';

interface VoteButtonsProps {
  qbId: number;
  onVote: (direction: 'more' | 'less') => Promise<void>;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function getCooldownKey(qbId: number): string {
  return `qb-vote-cooldown-${qbId}`;
}

export default function VoteButtons({ qbId, onVote }: VoteButtonsProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Check localStorage for existing cooldown
  useEffect(() => {
    const stored = localStorage.getItem(getCooldownKey(qbId));
    if (stored) {
      const endTime = parseInt(stored, 10);
      if (endTime > Date.now()) {
        setCooldownEnd(endTime);
      } else {
        localStorage.removeItem(getCooldownKey(qbId));
      }
    }
  }, [qbId]);

  // Update countdown timer
  useEffect(() => {
    if (!cooldownEnd) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = cooldownEnd - Date.now();
      if (remaining <= 0) {
        setCooldownEnd(null);
        setTimeLeft(0);
        localStorage.removeItem(getCooldownKey(qbId));
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd, qbId]);

  const handleVote = async (direction: 'more' | 'less') => {
    if (isVoting || cooldownEnd) return;

    setIsVoting(true);
    try {
      await onVote(direction);

      // Set cooldown
      const endTime = Date.now() + COOLDOWN_MS;
      setCooldownEnd(endTime);
      localStorage.setItem(getCooldownKey(qbId), endTime.toString());
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDisabled = isVoting || !!cooldownEnd;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={() => handleVote('more')}
          disabled={isDisabled}
          className={`btn-trust-more flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
            isDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {isVoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Voting...
            </span>
          ) : (
            <>
              <span className="mr-2">👍</span>
              Trust More
            </>
          )}
        </button>

        <button
          onClick={() => handleVote('less')}
          disabled={isDisabled}
          className={`btn-trust-less flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
            isDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {isVoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Voting...
            </span>
          ) : (
            <>
              <span className="mr-2">👎</span>
              Trust Less
            </>
          )}
        </button>
      </div>

      {cooldownEnd && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Vote again in{' '}
            <span className="text-white font-mono">{formatTime(timeLeft)}</span>
          </p>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-blue)] transition-all duration-1000"
              style={{
                width: `${((COOLDOWN_MS - timeLeft * 1000) / COOLDOWN_MS) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
