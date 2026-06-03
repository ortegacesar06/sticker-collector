import { useCollectionStore } from '../../store/collectionStore'
import { ProgressRing, TeamBar } from './ProgressComponents'
import { ShareButton } from '../../components/ShareButton'
import { findNearlyCompleteTeams } from '../../utils/tradeListBuilder'
import { getCatalog } from '../../data/catalog'

export default function StatsPage() {
  const getStats = useCollectionStore((s) => s.getStats)
  const getTeamProgress = useCollectionStore((s) => s.getTeamProgress)
  const getCount = useCollectionStore((s) => s.getCount)

  const stats = getStats()
  const teamProgress = getTeamProgress()

  const catalog = getCatalog()
  if (!catalog) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-missing">Catalogo no disponible</p>
      </div>
    )
  }

  const nearlyComplete = findNearlyCompleteTeams(teamProgress)

  const missingStickers = catalog.stickers
    .filter((s) => getCount(s.number) === 0)
    .map((s) => `${s.team}-${s.number}`)
    .join(', ')
  const missingListText = `Faltantes (${stats.missing}): ${missingStickers || 'ninguna'}`

  const sortedTeams = [...teamProgress].sort((a, b) => b.progress - a.progress)
  const progressPercent = stats.total > 0 ? Math.round((stats.have / stats.total) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <h1 className="text-lg font-semibold text-ink">Estadisticas</h1>
        <ShareButton text={missingListText} label="Compartir faltantes" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6" role="main" aria-label="Collection statistics">
        {/* Central progress ring */}
        <section className="flex flex-col items-center gap-3" aria-label="Overall progress">
          <ProgressRing 
            progress={progressPercent} 
            size={140} 
            strokeWidth={12} 
            label="Album" 
          />
          <div className="flex gap-6 text-center" role="list" aria-label="Collection counts">
            <div role="listitem">
              <p className="text-2xl font-bold text-pitch">{stats.have}</p>
              <p className="text-xs text-missing">Tengo</p>
            </div>
            <div role="listitem">
              <p className="text-2xl font-bold text-danger">{stats.missing}</p>
              <p className="text-xs text-missing">Faltan</p>
            </div>
            <div role="listitem">
              <p className="text-2xl font-bold text-accent">{stats.duplicateCount}</p>
              <p className="text-xs text-missing">Repes</p>
            </div>
          </div>
        </section>

        {/* Nearly complete teams highlight */}
        {nearlyComplete.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Almost complete teams">
            <h2 className="text-sm font-semibold text-ink">Casi completo!</h2>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Teams with 1-2 stickers missing">
              {nearlyComplete.map((t) => (
                <span 
                  key={t.team} 
                  className="rounded-full bg-pitch px-3 py-1 text-sm font-medium text-white"
                  role="listitem"
                >
                  {t.missing === 1 ? `1 de ${t.team}` : `2 de ${t.team}`}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Per-team progress bars */}
        <section className="flex flex-col gap-2" aria-label="Progress by team">
          <h2 className="text-sm font-semibold text-ink">Por equipo</h2>
          <div className="flex flex-col gap-1.5" role="list" aria-label="Team progress list">
            {sortedTeams.map((tp) => {
              const isNearlyComplete = tp.missing > 0 && tp.missing <= 2
              return <TeamBar key={tp.team} progress={tp} highlighted={isNearlyComplete} />
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
