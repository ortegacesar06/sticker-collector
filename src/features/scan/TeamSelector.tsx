import type { Sticker } from '../../data/types'
import { useCollectionStore } from '../../store/collectionStore'

interface Props {
  number: number
  matches: Sticker[]
  onSelect: (sticker: Sticker) => void
  onCancel: () => void
}

export function TeamSelector({ number, matches, onSelect, onCancel }: Props) {
  const getCount = useCollectionStore((s) => s.getCount)

  return (
    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 animate-slide-up">
      <div className="text-center mb-4">
        <p className="text-sm text-missing">El número</p>
        <p className="text-3xl font-bold text-ink">#{number}</p>
        <p className="text-sm text-missing">aparece en varios equipos</p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {matches.map((sticker) => (
          <button
            key={`${sticker.team}-${sticker.number}`}
            onClick={() => onSelect(sticker)}
            className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface/80 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-16 bg-gradient-to-br from-pitch to-pitch/80 rounded flex items-center justify-center text-white">
              <span className="text-sm font-bold">#{sticker.number}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-ink">{sticker.name}</p>
              <p className="text-xs text-missing">{sticker.team} · {sticker.position}</p>
              {sticker.club && (
                <p className="text-xs text-missing">{sticker.club}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-pitch">×{getCount(sticker.number)}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="w-full py-3 rounded-lg bg-surface text-ink font-medium active:scale-95 transition-transform"
      >
        Cancelar
      </button>
    </div>
  )
}
