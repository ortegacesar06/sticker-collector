import { useNavigate } from 'react-router-dom'
import type { Sticker } from '../data/types'
import { useCollectionStore } from '../store/collectionStore'

interface Props {
  sticker: Sticker
}

export function StickerCell({ sticker }: Props) {
  const navigate = useNavigate()
  const getCount = useCollectionStore((s) => s.getCount)
  const increment = useCollectionStore((s) => s.increment)
  const quickAddMode = useCollectionStore((s) => s.quickAddMode)

  const count = getCount(sticker.number)
  const has = count > 0
  const isDuplicate = count > 1

  const bgClass = has ? 'bg-pitch' : 'bg-missing'

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20)
    }
  }

  const handleClick = async () => {
    if (quickAddMode) {
      await increment(sticker.number)
      triggerHaptic()
    } else {
      navigate(`/sticker/${sticker.number}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const statusLabel = has 
    ? (isDuplicate ? `Sticker #${sticker.number} ${sticker.name}, ${count} copies` : `Sticker #${sticker.number} ${sticker.name}, owned`)
    : `Sticker #${sticker.number} ${sticker.name}, missing`

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative w-full aspect-[3/4] rounded-lg ${bgClass} text-white
        flex flex-col items-center justify-center overflow-hidden
        transition-all duration-200 ease-out active:scale-95
        ${!has ? 'grayscale opacity-60' : ''}
        touch-target
      `}
      aria-label={statusLabel}
      aria-pressed={has}
      data-sticker-number={sticker.number}
    >
      <span className="font-bold text-xs opacity-80">#{sticker.number}</span>
      <span className="text-[8px] leading-tight text-center px-1 opacity-70">
        {sticker.name.split(' ').slice(-1)[0]}
      </span>

      {isDuplicate && (
        <span 
          className="absolute top-0.5 right-0.5 bg-gold text-ink text-[8px] font-bold px-1 rounded-bl-md"
          aria-label={`${count} duplicates`}
        >
          ×{count}
        </span>
      )}
    </button>
  )
}
