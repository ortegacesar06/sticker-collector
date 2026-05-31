import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  text: string
  label?: string
  className?: string
}

export function ShareButton({ text, label = 'Compartir', className = '' }: ShareButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'shared'>('idle')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        setState('shared')
      } catch {
        // User cancelled or share failed — fall back to clipboard
        await copyToClipboard()
      }
    } else {
      await copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Clipboard API not available
    }
  }

  const icon = state === 'idle' ? <Share2 size={16} /> : state === 'copied' ? <Check size={16} /> : <Copy size={16} />
  const labelText = state === 'idle' ? label : state === 'copied' ? 'Copiado!' : 'Compartido!'

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all active:scale-95 ${className}`}
    >
      {icon}
      {labelText}
    </button>
  )
}