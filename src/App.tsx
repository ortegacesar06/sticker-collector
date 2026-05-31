import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const AlbumPage = lazy(() => import('./features/album/AlbumPage'))
const ScanPage = lazy(() => import('./features/scan/ScanPage'))
const RepesPage = lazy(() => import('./features/repes/RepesPage'))
const StatsPage = lazy(() => import('./features/stats/StatsPage'))
const StickerDetailPage = lazy(() => import('./features/sticker/StickerDetailPage'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-accent text-lg font-medium">Cargando...</div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AlbumPage />,
  },
  {
    path: '/sticker/:id',
    element: <StickerDetailPage />,
  },
  {
    path: '/scan',
    element: <ScanPage />,
  },
  {
    path: '/repes',
    element: <RepesPage />,
  },
  {
    path: '/stats',
    element: <StatsPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
])

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
