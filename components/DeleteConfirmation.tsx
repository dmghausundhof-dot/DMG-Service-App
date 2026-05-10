'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  itemName: string
  itemType?: string
  confirmButtonText?: string
}

export default function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title = "Eintrag wirklich löschen?",
  message = "Diese Aktion kann nicht rückgängig gemacht werden.",
  itemName,
  itemType = "Eintrag",
  confirmButtonText = "Ja, endgültig löschen"
}: DeleteConfirmationProps) {
  const [inputValue, setInputValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = inputValue.trim().toLowerCase() === itemName.trim().toLowerCase()

  const handleConfirm = async () => {
    if (!isConfirmed) return
    
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
      setInputValue('')
    }
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-8 relative">
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-red-400">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">{itemType}: <span className="font-medium text-white">{itemName}</span></p>
          </div>
        </div>

        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-red-400">{message}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Zur Bestätigung geben Sie den Namen exakt ein:
          </label>
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={itemName}
            className="input w-full text-base"
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Groß-/Kleinschreibung wird ignoriert
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleClose}
            disabled={isDeleting}
            className="btn-secondary flex-1 py-3"
          >
            Abbrechen
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400 text-white font-medium rounded-2xl transition flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Löschen...
              </>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
