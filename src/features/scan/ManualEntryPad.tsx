import { useState } from 'react'
import type { Sticker } from '../../data/types'
import { getStickerByNumber } from '../../data/catalog'
import { useCollectionStore } from '../../store/collectionStore'

interface Props {
  onConfirm: (sticker: Sticker) => void
  onCancel: () => void
}

export function ManualEntryPad({ onConfirm, onCancel }: Props) {
  const [digits, setDigits] = useState('')
  const getCount = useCollectionStore((s) => s.getCount)

  const number = parseInt(digits, 10) || 0
  const sticker = number > 0 ? getStickerByNumber(number) : null

  const handleDigit = (d: string) => {
    if (digits.length < 3) {
      setDigits(prev => prev + d)
    }
  }

  const handleBackspace = () => {
    setDigits(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setDigits('')
  }

  const handleConfirm = () => {
    if (sticker) {
      onConfirm(sticker)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') {
      if (key === 'C') handleClear()
      else if (key === '⌫') handleBackspace()
      else handleDigit(key)
    }
  }

  const digitRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ]

  return (
    <div className="flex flex-col h-full bg-white" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <h2 id="manual-entry-title" className="text-lg font-semibold text-ink">Entrada manual</h2>
        <button 
          onClick={onCancel} 
          className="p-2 text-missing touch-target flex items-center justify-center"
          aria-label="Cerrar entrada manual"
        >
          ✕
        </button>
      </div>

      {/* Display */}
      <div className="p-4">
        <div 
          className="bg-surface rounded-xl p-4 flex items-center justify-center min-h-[80px]" 
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {sticker ? (
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-20 bg-gradient-to-br from-pitch to-pitch/80 rounded-lg flex items-center justify-center text-white"
                role="img"
                aria-label={`Sticker #${sticker.number}`}
              >
                <span className="text-xl font-bold">#{sticker.number}</span>
              </div>
              <div>
                <p className="font-medium text-ink">{sticker.name}</p>
                <p className="text-sm text-missing">{sticker.team}</p>
                <p className="text-sm text-pitch">Ya tienes: {getCount(sticker.number)}</p>
              </div>
            </div>
          ) : digits.length > 0 ? (
            <div className="text-center">
              <span className="text-4xl font-bold text-ink">#{digits}</span>
              <p className="text-sm text-danger mt-1">Número no encontrado</p>
            </div>
          ) : (
            <span className="text-missing">Ingresá el número</span>
          )}
        </div>
      </div>

      {/* Keypad */}
      <div className="flex-1 flex flex-col justify-center px-8">
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Teclado numérico">
          {digitRows.flat().map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'C') handleClear()
                else if (key === '⌫') handleBackspace()
                else handleDigit(key)
              }}
              onKeyDown={(e) => handleKeyDown(e, key)}
              className={`
                h-14 rounded-xl text-xl font-medium transition-all active:scale-95 touch-target
                ${key === 'C' || key === '⌫'
                  ? 'bg-surface text-ink'
                  : 'bg-surface hover:bg-surface/80 text-ink'
                }
              `}
              aria-label={key === 'C' ? 'Limpiar' : key === '⌫' ? 'Borrar' : `Número ${key}`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm button */}
      <div className="p-4">
        <button
          onClick={handleConfirm}
          disabled={!sticker}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all active:scale-95 touch-target
            ${sticker
              ? 'bg-pitch text-white'
              : 'bg-surface text-missing cursor-not-allowed'
            }
          `}
          aria-disabled={!sticker}
          aria-label="Confirmar número de sticker"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
