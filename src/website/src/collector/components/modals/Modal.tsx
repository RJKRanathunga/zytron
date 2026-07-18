import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  icon?: ReactNode
  children: ReactNode
}

export function Modal({ title, description, isOpen, onClose, icon, children }: ModalProps) {
  const descriptionId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-description`

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop open" onMouseDown={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-modal="true"
        className="modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>
          x
        </button>
        {icon}
        <h2>{title}</h2>
        <p id={descriptionId}>{description}</p>
        {children}
      </section>
    </div>
  )
}
