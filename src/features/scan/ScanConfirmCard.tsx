import type { Sticker } from '../../data/types'
import { useCollectionStore } from '../../store/collectionStore'

interface Props {
  sticker: Sticker
  onConfirm: () => void
  onCorrect: () => void
  onDiscard: () => void
  isAdding?: boolean
}

export function ScanConfirmCard({ sticker, onConfirm, onCorrect, onDiscard, isAdding = true }: Props) {
  const getCount = useCollectionStore((s) => s.getCount)
  const count = getCount(sticker.number)

  return (
    <div 
      className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 animate-slide-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-confirm-title"
    >
      {/* Sticker preview */}
      <div className="flex gap-4">
        {/* Placeholder sticker image */}
        <div 
          className="w-20 h-28 bg-gradient-to-br from-pitch to-pitch/80 rounded-lg flex flex-col items-center justify-center text-white"
          role="img"
          aria-label={`Sticker #${sticker.number} ${sticker.name}`}
        >
          <span className="text-3xl font-bold">#{sticker.number}</span>
          <span className="text-xs opacity-70 mt-1">{sticker.team}</span>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 id="scan-confirm-title" className="font-semibold text-ink text-lg leading-tight">{sticker.name}</h3>
              <p className="text-sm text-missing">{sticker.team} · {sticker.position}</p>
              {sticker.club && (
                <p className="text-xs text-missing">{sticker.club}</p>
              )}
            </div>
            <span className="text-xs text-missing bg-surface px-2 py-0.5 rounded">
              #{sticker.number}
            </span>
          </div>

          {/* Current count */}
          <div className="mt-2 flex items-center gap-2" role="status" aria-live="polite">
            <span className="text-sm text-missing">Ya tienes:</span>
            <span className="font-bold text-pitch">{count}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4" role="group" aria-label="Confirmation actions">
        <button
          onClick={onDiscard}
          className="flex-1 py-3 rounded-lg bg-surface text-ink font-medium active:scale-95 transition-transform touch-target"
          aria-label="Descartar escaneo"
        >
          Descartar
        </button>
        <button
          onClick={onCorrect}
          className="flex-1 py-3 rounded-lg bg-accent-2 text-white font-medium active:scale-95 transition-transform touch-target"
          aria-label="Corregir número"
        >
          Corregir
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-lg bg-pitch text-white font-medium active:scale-95 transition-transform touch-target"
          aria-label={isAdding ? 'Agregar sticker a mi colección' : 'Confirmar sticker'}
        >
          {isAdding ? '+1 Tengo' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
