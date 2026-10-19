import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Side } from '../kin/types'

export const SIDE_STYLE: Record<Side, { bar: string; soft: string; text: string; label: string }> = {
  mine: { bar: 'bg-cheong', soft: 'bg-cheong-soft', text: 'text-cheong', label: '우리 집' },
  spouse: { bar: 'bg-hong', soft: 'bg-hong-soft', text: 'text-hong', label: '배우자 집' },
  child: { bar: 'bg-nori', soft: 'bg-nori-soft', text: 'text-nori', label: '우리 아이' },
}

export function useIsWide() {
  const q = '(min-width: 768px)'
  const [wide, setWide] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/** 넓은 화면에선 오른쪽 패널, 좁은 화면에선 아래에서 올라오는 시트 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const wide = useIsWide()
  const drag = useDragControls()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          {!wide && (
            <motion.div
              className="fixed inset-0 z-30 bg-ink/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
          <motion.aside
            role="dialog"
            aria-label={label}
            className={
              wide
                ? 'fixed top-[72px] right-4 bottom-4 z-40 w-[380px] overflow-y-auto rounded-[22px] border border-line/70 bg-card shadow-[0_20px_50px_-20px_rgb(31_36_51/0.35)]'
                : 'fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto rounded-t-[26px] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_-10px_rgb(31_36_51/0.3)]'
            }
            initial={wide ? { x: 420, opacity: 0 } : { y: '100%' }}
            animate={wide ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={wide ? { x: 420, opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag={wide ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            {!wide && (
              <div className="sticky top-0 z-10 flex touch-none justify-center bg-card pt-2.5 pb-1" onPointerDown={(e) => drag.start(e)}>
                <div className="h-1.5 w-11 rounded-full bg-line" />
              </div>
            )}
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Button({
  children,
  onClick,
  tone = 'plain',
  className = '',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'plain' | 'primary' | 'danger' | 'ghost'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const tones = {
    plain: 'bg-paper text-ink hover:bg-line/50',
    primary: 'bg-ink text-white hover:bg-ink/85',
    danger: 'bg-hong-soft text-hong hover:bg-hong/15',
    ghost: 'text-muted hover:text-ink hover:bg-paper',
  }
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </motion.button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="relative inline-flex rounded-xl bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${value === o.value ? 'text-ink' : 'text-muted'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${name}`} className="absolute inset-0 -z-10 rounded-lg bg-card shadow-sm" transition={{ type: 'spring', damping: 28, stiffness: 400 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-base outline-none transition focus:border-cheong focus:ring-2 focus:ring-cheong/20'
