import type { TeamProgress } from '../../data/types'

interface ProgressRingProps {
  progress: number // 0–100
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({ progress, size = 120, strokeWidth = 10, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F4F5F7"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5007D"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink">{progress}%</span>
          {label && <span className="text-xs text-missing">{label}</span>}
        </div>
      </div>
    </div>
  )
}

interface TeamBarProps {
  progress: TeamProgress
  highlighted?: boolean
}

export function TeamBar({ progress, highlighted = false }: TeamBarProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl px-3 py-2 ${highlighted ? 'bg-pitch/10 border border-pitch/30' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{progress.team}</span>
        <div className="flex items-center gap-2">
          {highlighted && (
            <span className="rounded-full bg-pitch px-2 py-0.5 text-xs font-bold text-white">
              {progress.missing} faltan
            </span>
          )}
          <span className="text-xs text-missing">
            {progress.have}/{progress.total}
          </span>
          <span className="text-xs font-medium text-accent">{progress.progress}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-surface">
        <div
          className="h-2 rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  )
}