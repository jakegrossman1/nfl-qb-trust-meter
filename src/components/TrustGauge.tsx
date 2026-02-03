'use client';

import { useEffect, useState } from 'react';

interface TrustGaugeProps {
  score: number;
  size?: number;
  animated?: boolean;
}

function getGradientId(score: number): string {
  if (score >= 70) return 'gradient-green';
  if (score >= 50) return 'gradient-yellow';
  if (score >= 30) return 'gradient-orange';
  return 'gradient-red';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Elite Starter';
  if (score >= 65) return 'Trusted';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Shaky';
  if (score >= 20) return 'Risky';
  return 'Bust Alert';
}

export default function TrustGauge({ score, size = 280, animated = true }: TrustGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [isAnimating, setIsAnimating] = useState(animated);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    setIsAnimating(true);
    const duration = 1000;
    const startTime = Date.now();
    const startScore = displayScore;
    const endScore = score;

    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScore = startScore + (endScore - startScore) * easeOut;

      setDisplayScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animateScore);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animateScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, animated]);

  const radius = 90;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = Math.PI * normalizedRadius; // Semi-circle
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const gradientId = getGradientId(Math.round(displayScore));
  const label = getScoreLabel(Math.round(displayScore));

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${radius * 2} ${radius + 20}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d166" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="gradient-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="url(#glow)"
          className={isAnimating ? '' : 'transition-all duration-500'}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = Math.PI - (tick / 100) * Math.PI;
          const innerRadius = normalizedRadius - 20;
          const outerRadius = normalizedRadius - 10;
          const x1 = radius + innerRadius * Math.cos(angle);
          const y1 = radius - innerRadius * Math.sin(angle);
          const x2 = radius + outerRadius * Math.cos(angle);
          const y2 = radius - outerRadius * Math.sin(angle);

          return (
            <g key={tick}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--card-border)"
                strokeWidth="2"
              />
              <text
                x={radius + (innerRadius - 15) * Math.cos(angle)}
                y={radius - (innerRadius - 15) * Math.sin(angle)}
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Score display */}
      <div className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: 0 }}>
        <div className="text-center">
          <span className={`text-5xl font-bold ${
            displayScore >= 70 ? 'text-green-400' :
            displayScore >= 50 ? 'text-yellow-400' :
            displayScore >= 30 ? 'text-orange-400' :
            'text-red-400'
          }`}>
            {Math.round(displayScore)}
          </span>
          <p className="text-gray-400 text-sm mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}
