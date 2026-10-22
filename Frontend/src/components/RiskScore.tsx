import React from 'react';

interface RiskScoreProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskScore: React.FC<RiskScoreProps> = ({
  score,
  maxScore = 100,
  size = 'md',
  showLabel = true
}) => {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);

  const getColor = (val: number) => {
    if (val >= 80) return { text: 'text-rose-400', stroke: '#f43f5e', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
    if (val >= 60) return { text: 'text-amber-400', stroke: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { text: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  };

  const colors = getColor(score);

  if (size === 'sm') {
    return (
      <div id={`risk-score-sm-${score}`} className="inline-flex items-center gap-2 font-mono">
        <span className={`font-bold text-sm ${colors.text}`}>{score}</span>
        <span className="text-slate-500 text-xs">/{maxScore}</span>
        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%`, backgroundColor: colors.stroke }}
          />
        </div>
      </div>
    );
  }

  if (size === 'lg') {
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div id={`risk-score-lg-${score}`} className="flex flex-col items-center justify-center p-4 bg-[#0a0f19] rounded-xl border border-slate-800">
        {showLabel && (
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 mb-2">
            Risk Score Index
          </span>
        )}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 108 108">
            <circle
              cx="54"
              cy="54"
              r={radius}
              stroke="#1e293b"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="54"
              cy="54"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${colors.text}`}>
              {score}
            </span>
            <span className="text-[11px] font-mono text-slate-500">/ {maxScore}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default 'md'
  return (
    <div id={`risk-score-md-${score}`} className="inline-flex items-center gap-2">
      <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
        {score} / {maxScore}
      </div>
    </div>
  );
};
