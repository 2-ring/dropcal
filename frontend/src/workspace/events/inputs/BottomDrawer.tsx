import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './BottomDrawer.css'

interface BottomDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomDrawer({ isOpen, onClose, title, children }: BottomDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-handle" />
        {title && <div className="drawer-title">{title}</div>}
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
