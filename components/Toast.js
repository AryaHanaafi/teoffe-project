'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

let toastId = 0
let globalAddToast = null

/**
 * Show a toast notification from anywhere
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 */
export function showToast(message, type = 'success') {
  if (globalAddToast) {
    globalAddToast(message, type)
  }
}

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    setTimeout(() => removeToast(id), 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  return (
    <>
      {children}
      {mounted && createPortal(
        <div className="toast-container" role="alert" aria-live="polite">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
            >
              <span className="toast-icon">{ICONS[toast.type]}</span>
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Tutup notifikasi"
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
