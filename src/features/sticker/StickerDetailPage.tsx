import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { getStickerByNumber } from '../../data/catalog'
import { useCollectionStore } from '../../store/collectionStore'

export default function StickerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getCount = useCollectionStore((s) => s.getCount)
  const increment = useCollectionStore((s) => s.increment)
  const decrement = useCollectionStore((s) => s.decrement)
  const setZero = useCollectionStore((s) => s.setZero)
  const getAdjacentStickerNumbers = useCollectionStore((s) => s.getAdjacentStickerNumbers)

  const number = Number(id)
  const sticker = getStickerByNumber(number)
  const count = getCount(number)
  const adjacent = getAdjacentStickerNumbers(number)

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const MIN_SWIPE = 50

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20)
    }
  }

  const navigateTo = (stickerNumber: number) => {
    navigate(`/sticker/${stickerNumber}`)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return

    const delta = touchStartX.current - touchEndX.current

    if (Math.abs(delta) > MIN_SWIPE) {
      if (delta > 0 && adjacent.next !== null) {
        navigateTo(adjacent.next)
      } else if (delta < 0 && adjacent.prev !== null) {
        navigateTo(adjacent.prev)
      }
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && adjacent.prev !== null) {
      e.preventDefault()
      navigateTo(adjacent.prev)
    } else if (e.key === 'ArrowRight' && adjacent.next !== null) {
      e.preventDefault()
      navigateTo(adjacent.next)
    }
  }

  if (!sticker) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" role="alert">
        <p className="text-danger">Sticker #{id} not found</p>
        <button onClick={() => navigate(-1)} className="text-accent underline">Go back</button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label={`Sticker detail: ${sticker.name}`}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <button 
          onClick={() => navigate(-1)} 
          className="text-ink active:scale-95 transition-transform touch-target flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink">{sticker.name}</h1>
          <p className="text-missing text-sm">#{sticker.number} · {sticker.team}</p>
        </div>
        <div className="text-xs text-missing font-mono">pg. {sticker.page ?? '?'}</div>
      </div>

      {/* Swipe Navigation */}
      <div className="flex items-center px-2 mb-2" role="navigation" aria-label="Sticker navigation">
        {adjacent.prev !== null ? (
          <button
            onClick={() => navigateTo(adjacent.prev!)}
            className="flex items-center gap-1 text-ink text-sm active:scale-95 transition-transform touch-target py-2"
            aria-label={`Previous sticker, #${adjacent.prev}`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="text-xs opacity-60">#{adjacent.prev}</span>
          </button>
        ) : <div />}
        {adjacent.next !== null && (
          <button
            onClick={() => navigateTo(adjacent.next!)}
            className="ml-auto flex items-center gap-1 text-ink text-sm active:scale-95 transition-transform touch-target py-2"
            aria-label={`Next sticker, #${adjacent.next}`}
          >
            <span className="text-xs opacity-60">#{adjacent.next}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sticker Preview */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`
            bg-surface rounded-2xl w-56 h-80 flex flex-col items-center justify-center
            overflow-hidden shadow-lg
            transition-all duration-200
            ${count > 0 ? '' : 'grayscale opacity-60'}
          `}
          role="img"
          aria-label={`Sticker ${sticker.name}, number ${sticker.number}, ${count > 0 ? 'owned' : 'not owned'}`}
        >
          {/* Flag placeholder */}
          <div className="text-4xl mb-2" aria-hidden="true">
            {sticker.countryCode === 'AR' ? '🇦🇷' : sticker.countryCode === 'BR' ? '🇧🇷' : '🏳️'}
          </div>
          {/* Sticker number */}
          <span className="text-5xl font-bold text-ink opacity-20 mb-2" aria-hidden="true">#{sticker.number}</span>
          {/* Player name */}
          <span className="text-sm font-medium text-ink text-center px-4">{sticker.name}</span>
          {/* Position badge */}
          <span className="mt-2 px-2 py-0.5 rounded-full bg-accent text-white text-xs">{sticker.position}</span>
          {/* Club */}
          {sticker.club && (
            <span className="mt-1 text-xs text-missing">{sticker.club}</span>
          )}
          {/* Jersey */}
          {sticker.jersey !== undefined && (
            <span className="text-xs text-missing">#{sticker.jersey}</span>
          )}
        </div>
      </div>

      {/* Player Info Row */}
      <div className="flex items-center justify-center gap-4 px-6 pb-4 text-xs text-missing" role="contentinfo">
        <span className="font-medium">{sticker.team}</span>
        <span>·</span>
        <span>{sticker.position}</span>
        {sticker.club && (
          <>
            <span>·</span>
            <span className="truncate max-w-24">{sticker.club}</span>
          </>
        )}
        {sticker.jersey !== undefined && (
          <>
            <span>·</span>
            <span>#{sticker.jersey}</span>
          </>
        )}
      </div>

      {/* Count Controls */}
      <div className="flex items-center justify-center gap-8 p-6 border-t border-surface" role="group" aria-label="Sticker count controls">
        <button
          onClick={() => {
            if (count > 0) {
              decrement(sticker.number)
              triggerHaptic()
            }
          }}
          disabled={count === 0}
          className="w-14 h-14 rounded-full bg-surface text-ink text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform touch-target disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Decrease count"
          aria-disabled={count === 0}
        >
          −
        </button>
        <div className="flex flex-col items-center" role="status" aria-live="polite">
          <span className="text-4xl font-bold text-ink" aria-label={`${count} stickers owned`}>{count}</span>
          <span className="text-missing text-xs uppercase tracking-wider">Have</span>
        </div>
        <button
          onClick={() => {
            increment(sticker.number)
            triggerHaptic()
          }}
          className="w-14 h-14 rounded-full bg-accent text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform touch-target"
          aria-label="Increase count"
        >
          +
        </button>
      </div>

      {/* Set Zero button */}
      {count > 0 && (
        <div className="px-6 pb-6">
          <button
            onClick={() => {
              setZero(sticker.number)
              triggerHaptic()
            }}
            className="w-full py-3 rounded-lg bg-surface text-danger text-sm font-medium active:scale-95 transition-transform touch-target"
            aria-label="Remove all stickers, set count to zero"
          >
            Remove all (set to 0)
          </button>
        </div>
      )}
    </div>
  )
}
