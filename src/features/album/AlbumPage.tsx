import { useEffect, useState } from 'react'
import { loadCatalog } from '../../data/catalog'
import { BottomNav } from '../../components/BottomNav'
import { FilterBar } from '../../components/FilterBar'
import { AlbumGrid } from '../../components/AlbumGrid'
import { useCollectionStore } from '../../store/collectionStore'

export default function AlbumPage() {
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadFromDexie = useCollectionStore((s) => s.loadFromDexie)

  useEffect(() => {
    loadCatalog()
      .then(() => {
        setCatalogLoaded(true)
        return loadFromDexie()
      })
      .catch((err) => setLoadError(String(err)))
  }, [loadFromDexie])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p className="text-danger font-medium">Error loading catalog</p>
        <p className="text-missing text-sm">{loadError}</p>
      </div>
    )
  }

  if (!catalogLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-accent font-medium">Loading album...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <FilterBar />
      <div className="flex-1 overflow-auto">
        <AlbumGrid />
      </div>
      <BottomNav />
    </div>
  )
}
