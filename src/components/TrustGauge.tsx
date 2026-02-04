'use client';

import { useEffect, useState } from 'react';

interface TrustGaugeProps {
  score: number;
  size?: number;
  animated?: boolean;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Elite';
  if (score >= 65) return 'Trusted';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Shaky';
  if (score >= 20) return 'Risky';
  return 'Bust Alert';
}

export default function TrustGauge({ score, size = 280, animated = true }: TrustGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

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
      }
    };

    requestAnimationFrame(animateScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, animated]);

  const centerX = 100;
  const centerY = 95;
  const outerRadius = 85;
  const innerRadius = 55;

  // Calculate needle angle (0 = left, 180 = right, score 0-100 maps to this)
  const needleAngle = Math.PI - (displayScore / 100) * Math.PI;
  const needleLength = 60;
  const needleX = centerX + needleLength * Math.cos(needleAngle);
  const needleY = centerY - needleLength * Math.sin(needleAngle);

  // Create arc path for a segment
  const createArcPath = (startPercent: number, endPercent: number) => {
    const startAngle = Math.PI - (startPercent / 100) * Math.PI;
    const endAngle = Math.PI - (endPercent / 100) * Math.PI;

    const outerStartX = centerX + outerRadius * Math.cos(startAngle);
    const outerStartY = centerY - outerRadius * Math.sin(startAngle);
    const outerEndX = centerX + outerRadius * Math.cos(endAngle);
    const outerEndY = centerY - outerRadius * Math.sin(endAngle);

    const innerStartX = centerX + innerRadius * Math.cos(endAngle);
    const innerStartY = centerY - innerRadius * Math.sin(endAngle);
    const innerEndX = centerX + innerRadius * Math.cos(startAngle);
    const innerEndY = centerY - innerRadius * Math.sin(startAngle);

    const largeArc = endPercent - startPercent > 50 ? 1 : 0;

    return `M ${outerStartX} ${outerStartY}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}
            L ${innerStartX} ${innerStartY}
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEndX} ${innerEndY}
            Z`;
  };

  // Segments: dark red, red, orange, yellow, green (from left to right, 0 to 100)
  const segments = [
    { start: 0, end: 20, color: '#991b1b' },    // Dark red (0-20)
    { start: 20, end: 40, color: '#dc2626' },   // Red (20-40)
    { start: 40, end: 60, color: '#f97316' },   // Orange (40-60)
    { start: 60, end: 80, color: '#eab308' },   // Yellow (60-80)
    { start: 80, end: 100, color: '#22c55e' },  // Green (80-100)
  ];

  const label = getScoreLabel(Math.round(displayScore));

  // Scale factor for the SVG
  const scale = size / 200;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 50 }}>
      <svg
        width={size}
        height={size / 2 + 30}
        viewBox="0 0 200 130"
        className="overflow-visible"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Colored segments */}
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.start, segment.end)}
            fill={segment.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Inner white/dark semicircle for the gauge face */}
        <path
          d={`M ${centerX - innerRadius + 5} ${centerY}
              A ${innerRadius - 5} ${innerRadius - 5} 0 0 1 ${centerX + innerRadius - 5} ${centerY}`}
          fill="var(--card-bg, #1a1a2e)"
          stroke="none"
        />

        {/* Tick marks on inner edge */}
        {[0, 20, 40, 60, 80, 100].map((tick) => {
          const angle = Math.PI - (tick / 100) * Math.PI;
          const tickInnerRadius = innerRadius - 3;
          const tickOuterRadius = innerRadius + 3;
          const x1 = centerX + tickInnerRadius * Math.cos(angle);
          const y1 = centerY - tickInnerRadius * Math.sin(angle);
          const x2 = centerX + tickOuterRadius * Math.cos(angle);
          const y2 = centerY - tickOuterRadius * Math.sin(angle);

          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
            />
          );
        })}

        {/* "TRUST SCORE" text curved along the inner arc */}
        <text
          x={centerX}
          y={centerY - 25}
          fill="#9ca3af"
          fontSize="8"
          textAnchor="middle"
          fontWeight="500"
          letterSpacing="1"
        >
          TRUST SCORE
        </text>

        {/* Needle */}
        <g filter="url(#shadow)">
          {/* Needle body */}
          <polygon
            points={`
              ${centerX},${centerY - 6}
              ${needleX},${needleY}
              ${centerX},${centerY + 6}
            `}
            fill="#6b7280"
          />
          {/* Needle center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r="8"
            fill="#4b5563"
            stroke="#374151"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* Score display below the gauge */}
      <div className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: 0 }}>
        <div className="text-center">
          <span className={`text-4xl font-bold ${
            displayScore >= 80 ? 'text-green-400' :
            displayScore >= 60 ? 'text-yellow-400' :
            displayScore >= 40 ? 'text-orange-400' :
            displayScore >= 20 ? 'text-red-500' :
            'text-red-700'
          }`}>
            {Math.round(displayScore)}
          </span>
          <p className="text-gray-400 text-sm mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}
