import { useNavigate } from 'react-router-dom'
import type { Sticker } from '../data/types'
import { useCollectionStore } from '../store/collectionStore'

interface Props {
  sticker: Sticker
}

export function StickerCell({ sticker }: Props) {
  const navigate = useNavigate()
  const getCount = useCollectionStore((s) => s.getCount)

  const count = getCount(sticker.number)
  const has = count > 0
  const isDuplicate = count > 1

  const bgClass = has ? 'bg-pitch' : 'bg-missing'
  const textClass = has ? 'text-white' : 'text-white'

  return (
    <button
      onClick={() => navigate(`/sticker/${sticker.number}`)}
      className={`relative w-full aspect-[3/4] rounded-lg ${bgClass} ${textClass} flex flex-col items-center justify-center overflow-hidden transition-all active:scale-95`}
    >
      <span className="font-bold text-xs opacity-80">#{sticker.number}</span>
      <span className="text-[8px] leading-tight text-center px-1 opacity-70">
        {sticker.name.split(' ').slice(-1)[0]}
      </span>

      {isDuplicate && (
        <span className="absolute top-0.5 right-0.5 bg-gold text-ink text-[8px] font-bold px-1 rounded-bl-md">
          ×{count}
        </span>
      )}
    </button>
  )
}
