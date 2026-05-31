import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getStickerByNumber } from '../../data/catalog'
import { useCollectionStore } from '../../store/collectionStore'

export default function StickerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getCount = useCollectionStore((s) => s.getCount)
  const increment = useCollectionStore((s) => s.increment)
  const decrement = useCollectionStore((s) => s.decrement)

  const number = Number(id)
  const sticker = getStickerByNumber(number)
  const count = getCount(number)

  if (!sticker) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-danger">Sticker #{id} not found</p>
        <button onClick={() => navigate(-1)} className="text-accent underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-ink">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink">{sticker.name}</h1>
          <p className="text-missing text-sm">#{sticker.number} · {sticker.team}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-surface rounded-2xl w-48 h-64 flex items-center justify-center">
          <span className="text-missing text-sm text-center px-4">{sticker.image}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8">
        <button
          onClick={() => decrement(sticker.number)}
          className="w-14 h-14 rounded-full bg-surface text-ink text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
        >
          −
        </button>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-ink">{count}</span>
          <span className="text-missing text-xs uppercase tracking-wider">Have</span>
        </div>
        <button
          onClick={() => increment(sticker.number)}
          className="w-14 h-14 rounded-full bg-accent text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  )
}
