import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Upload, Trash2, Sun, Moon, Monitor, HardDrive, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCatalog } from '../../data/catalog'
import { useCollectionStore } from '../../store/collectionStore'
import { getMeta, upsertMeta } from '../../data/db'
import { initTheme, setTheme, type Theme } from '../../utils/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportPayload {
  version: string
  exportedAt: number
  entries: Array<{ stickerNumber: number; count: number; lastUpdated: number }>
}

interface StorageEstimate {
  used: number
  quota: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) return false
  return navigator.storage.persist()
}

async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage || !navigator.storage.estimate) return null
  const est = await navigator.storage.estimate()
  return { used: est.usage ?? 0, quota: est.quota ?? 0 }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function exportCollection(): Promise<void> {
  const catalog = getCatalog()
  const entries = await useCollectionStore.getState().exportData()
  const payload: ImportPayload = {
    version: catalog?.version ?? 'unknown',
    exportedAt: Date.now(),
    entries,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stickers-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  await upsertMeta({ lastBackupAt: Date.now() })
}

function readFile(file: File): Promise<ImportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as ImportPayload
        resolve(json)
      } catch {
        reject(new Error('Archivo JSON inválido'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}

function validatePayload(payload: unknown): payload is ImportPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return (
    typeof p.version === 'string' &&
    typeof p.exportedAt === 'number' &&
    Array.isArray(p.entries) &&
    p.entries.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as Record<string, unknown>).stickerNumber === 'number' &&
        typeof (e as Record<string, unknown>).count === 'number' &&
        typeof (e as Record<string, unknown>).lastUpdated === 'number',
    )
  )
}

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate()
  const importData = useCollectionStore((s) => s.importData)
  const resetAll = useCollectionStore((s) => s.resetAll)

  const [theme, setThemeState] = useState<Theme>('system')
  const [storage, setStorage] = useState<StorageEstimate | null>(null)
  const [lastBackup, setLastBackup] = useState<number | undefined>(undefined)
  const [persistentGranted, setPersistentGranted] = useState(false)

  // Import state
  const [importStep, setImportStep] = useState<'idle' | 'preview' | 'merging' | 'done' | 'error'>('idle')
  const [importPayload, setImportPayload] = useState<ImportPayload | null>(null)
  const [importError, setImportError] = useState('')

  // Reset state
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetError, setResetError] = useState('')

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Init
  useEffect(() => {
    initTheme()
    getMeta().then((meta) => {
      setThemeState(meta?.theme ?? 'system')
      setLastBackup(meta?.lastBackupAt)
    })
    getStorageEstimate().then(setStorage)
  }, [])

  // Theme handler
  const handleThemeChange = async (t: Theme) => {
    setThemeState(t)
    await setTheme(t)
  }

  // Export handler
  const handleExport = useCallback(async () => {
    if (!persistentGranted) {
      const granted = await requestPersistentStorage()
      setPersistentGranted(granted)
    }
    await exportCollection()
    setLastBackup(Date.now())
    await getStorageEstimate().then(setStorage)
  }, [persistentGranted])

  // Import handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')

    let payload: ImportPayload
    try {
      payload = await readFile(file)
    } catch (err) {
      setImportError(String(err))
      return
    }

    if (!validatePayload(payload)) {
      setImportError('Formato de backup inválido')
      return
    }

    setImportPayload(payload)
    setImportStep('preview')
  }

  const handleImportConfirm = async (mode: 'merge' | 'replace') => {
    if (!importPayload) return
    setImportStep('merging')
    try {
      await importData(importPayload.entries, mode)
      setImportStep('done')
      setImportPayload(null)
      setLastBackup(Date.now())
      await getStorageEstimate().then(setStorage)
    } catch (err) {
      setImportError(String(err))
      setImportStep('preview')
    }
  }

  const handleImportCancel = () => {
    setImportStep('idle')
    setImportPayload(null)
    setImportError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Reset handlers
  const handleResetFirst = () => setResetStep(1)
  const handleResetCancel = () => { setResetStep(0); setResetError('') }
  const handleResetConfirm = async () => {
    if (resetStep === 1) {
      setResetStep(2)
      return
    }
    try {
      await resetAll()
      setResetStep(0)
      await getStorageEstimate().then(setStorage)
    } catch (err) {
      setResetError(String(err))
    }
  }

  // Backup reminder
  const showBackupReminder =
    lastBackup !== undefined && Date.now() - lastBackup > 7 * 24 * 60 * 60 * 1000

  const backupDaysAgo = lastBackup ? Math.round((Date.now() - lastBackup) / (24 * 60 * 60 * 1000)) : null

  return (
    <div className="flex flex-col min-h-full bg-bg">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-surface">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface active:scale-95 transition-transform">
          <ArrowLeft size={22} className="text-ink" />
        </button>
        <h1 className="text-xl font-semibold text-ink">Configuración</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Backup reminder */}
        {showBackupReminder && (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-start gap-3">
            <HardDrive size={20} className="text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink">Hace {backupDaysAgo} días que no haces backup</p>
              <p className="text-xs text-missing mt-1">Exportá tu colección para no perder ningún dato</p>
            </div>
          </div>
        )}

        {/* Storage info */}
        {storage && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-missing uppercase tracking-wider">Almacenamiento</h2>
            <div className="bg-surface rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-missing">Usado</span>
                <span className="text-ink font-medium">{formatBytes(storage.used)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-missing">Disponible</span>
                <span className="text-ink font-medium">{formatBytes(storage.quota)}</span>
              </div>
              <div className="w-full bg-missing/20 rounded-full h-1.5 mt-1">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all"
                  style={{ width: storage.quota > 0 ? `${Math.min((storage.used / storage.quota) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Backup section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-missing uppercase tracking-wider">Backup</h2>
          <div className="bg-surface rounded-xl overflow-hidden">
            {/* Export */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-bg/50">
              <div>
                <p className="text-sm font-medium text-ink">Exportar colección</p>
                <p className="text-xs text-missing mt-0.5">Descarga un archivo JSON con todos tus stickers</p>
              </div>
              <button
                onClick={handleExport}
                className="shrink-0 flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium active:scale-95 transition-transform"
              >
                <Download size={16} />
                Exportar
              </button>
            </div>

            {/* Import */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-ink">Importar colección</p>
                <p className="text-xs text-missing mt-0.5">Cargá un archivo de backup previamente exportado</p>
              </div>
              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-input"
                />
                <label
                  htmlFor="import-input"
                  className="flex items-center gap-2 bg-surface border border-ink/20 text-ink px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer active:scale-95 transition-transform hover:border-ink/40"
                >
                  <Upload size={16} />
                  Importar
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Theme section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-missing uppercase tracking-wider">Tema</h2>
          <div className="bg-surface rounded-xl p-1 flex gap-1">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-medium transition-all ${
                  theme === value
                    ? 'bg-bg text-ink shadow-sm'
                    : 'text-missing hover:text-ink'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-danger uppercase tracking-wider">Zona de peligro</h2>
          <div className="bg-surface rounded-xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Resetear colección</p>
                <p className="text-xs text-missing mt-0.5">Borrá todos los stickers y empezá de nuevo</p>
              </div>
              <button
                onClick={handleResetFirst}
                className="shrink-0 flex items-center gap-2 bg-danger/10 text-danger border border-danger/20 px-4 py-2.5 rounded-lg text-sm font-medium active:scale-95 transition-transform"
              >
                <Trash2 size={16} />
                Resetear
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Import modal */}
      {importStep === 'preview' && importPayload && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-bg rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-ink">Importar backup</h3>
            <p className="text-sm text-missing">
              El archivo contiene <strong>{importPayload.entries.length} stickers</strong> del{' '}
              {new Date(importPayload.exportedAt).toLocaleDateString('es-AR')}.
            </p>
            <p className="text-sm text-missing">¿Cómo querés importarlo?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleImportConfirm('merge')}
                className="flex-1 bg-accent text-white py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                Combinar
              </button>
              <button
                onClick={() => handleImportConfirm('replace')}
                className="flex-1 bg-ink text-white py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                Reemplazar
              </button>
            </div>
            <button onClick={handleImportCancel} className="w-full text-sm text-missing py-2">
              Cancelar
            </button>
            {importError && <p className="text-sm text-danger">{importError}</p>}
          </div>
        </div>
      )}

      {importStep === 'merging' && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-bg rounded-2xl w-full max-w-sm p-6 text-center">
            <p className="text-ink font-medium">Importando...</p>
          </div>
        </div>
      )}

      {importStep === 'done' && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-bg rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <p className="text-lg font-semibold text-ink">¡Importado!</p>
            <button
              onClick={() => setImportStep('idle')}
              className="w-full bg-accent text-white py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Reset step 1 dialog */}
      {resetStep === 1 && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-bg rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-danger">¿Estás seguro?</h3>
            <p className="text-sm text-missing">
              Esta acción va a <strong>borrar todos tus stickers</strong>. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetCancel}
                className="flex-1 bg-surface text-ink py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-ink/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetConfirm}
                className="flex-1 bg-danger text-white py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset step 2 dialog */}
      {resetStep === 2 && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-bg rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-danger">Confirmar reset</h3>
            <p className="text-sm text-missing">
              Escribí "resetear" para confirmar que querés borrar toda tu colección.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetCancel}
                className="flex-1 bg-surface text-ink py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-ink/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetConfirm}
                className="flex-1 bg-danger text-white py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                Confirmar reset
              </button>
            </div>
            {resetError && <p className="text-sm text-danger">{resetError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}