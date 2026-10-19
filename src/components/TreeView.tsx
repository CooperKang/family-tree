import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { layout, NODE_H, NODE_W } from '../kin/layout'
import { relate } from '../kin/terms'
import type { Family, Relation, Side } from '../kin/types'
import { PREVIEW_BABY_ID } from '../store'
import { SIDE_STYLE } from './ui'

interface Props {
  fam: Family
  sides: Map<string, Side>
  viewerId: string
  targetId: string | null
  onTap: (id: string) => void
  onBackground: () => void
}

function Node({
  fam,
  id,
  side,
  rel,
  isViewer,
  isTarget,
  dim,
  onTap,
  index,
}: {
  fam: Family
  id: string
  side: Side
  rel: Relation | null
  isViewer: boolean
  isTarget: boolean
  dim: boolean
  onTap: () => void
  index: number
}) {
  const p = fam.people[id]
  const s = SIDE_STYLE[side]
  const preview = id === PREVIEW_BABY_ID || p.unborn
  const name = p.name || (preview ? '아기' : '이름 모름')
  // 크게: 실제로 부르는 말. 이름으로 부르는 사이(동생, 자녀)면 관계 이름을 크게 쓴다
  const firstCall = rel?.call.split(', ')[0] ?? ''
  const callsByName = !!p.name && p.name.endsWith(firstCall)
  const term = isViewer ? (id === fam.meId ? '나' : '기준') : !rel?.known || callsByName ? rel?.ref : firstCall
  const sub = isViewer || !rel?.known || rel.ref === term ? null : callsByName ? null : rel.ref
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      aria-label={`${name}, ${term}`}
      aria-pressed={isTarget}
      className={`group absolute flex flex-col items-center justify-center overflow-hidden rounded-[18px] text-center outline-offset-4 ${
        isViewer ? 'bg-ink text-white' : 'bg-card text-ink'
      } ${preview ? 'border-2 border-dashed border-nori' : ''}`}
      style={{ width: NODE_W, height: NODE_H, perspective: 600 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: dim ? 0.35 : 1,
        scale: isTarget ? 1.1 : 1,
        boxShadow: isTarget
          ? '0 14px 30px -10px rgb(31 36 51 / 0.45)'
          : isViewer
            ? '0 0 0 5px rgb(31 36 51 / 0.12)'
            : '0 3px 10px -4px rgb(31 36 51 / 0.25)',
      }}
      transition={{ type: 'spring', damping: 22, stiffness: 300, delay: Math.min(index * 0.012, 0.4) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.92 }}
    >
      <span className={`absolute inset-x-0 top-0 h-1.5 ${s.bar}`} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={term}
          className={`font-term px-1.5 leading-tight font-bold ${(term?.length ?? 0) > 7 ? 'text-[12px]' : (term?.length ?? 0) > 5 ? 'text-[15px]' : 'text-[19px]'}`}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.28, delay: Math.min(index * 0.01, 0.25) }}
        >
          {term}
        </motion.span>
      </AnimatePresence>
      {sub && <span className={`max-w-full truncate px-2 text-[11px] font-semibold ${s.text}`}>{sub}</span>}
      <span className={`mt-0.5 max-w-full truncate px-2 text-[11px] ${isViewer ? 'text-white/70' : 'text-muted'}`}>
        {name}
        {p.birthYear ? ` · ${String(p.birthYear).slice(2)}년생` : ''}
      </span>
    </motion.button>
  )
}

export default function TreeView({ fam, sides, viewerId, targetId, onTap, onBackground }: Props) {
  const l = useMemo(() => layout(fam), [fam])
  const rels = useMemo(() => {
    const m = new Map<string, Relation | null>()
    for (const id of Object.keys(fam.people)) m.set(id, relate(fam, viewerId, id))
    return m
  }, [fam, viewerId])
  const ref = useRef<ReactZoomPanPinchRef>(null)

  /** id인 사람을 화면의 (fx, fy) 비율 위치로 옮긴다 */
  const focus = (id: string, opts: { scale?: number; fx?: number; fy?: number; ms?: number } = {}) => {
    const api = ref.current
    const box = api?.instance.wrapperComponent?.getBoundingClientRect()
    const n = l.nodes.find((x) => x.id === id)
    if (!api || !box || !n) return
    const scale = opts.scale ?? api.state.scale
    api.setTransform(box.width * (opts.fx ?? 0.5) - n.x * scale, box.height * (opts.fy ?? 0.5) - n.y * scale, scale, opts.ms ?? 400, 'easeOut')
  }

  // 처음 열면: 전체가 적당한 크기로 들어오면 한눈에, 너무 크면 나를 중심으로
  const focused = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => {
      if (focused.current) return
      const box = ref.current?.instance.wrapperComponent?.getBoundingClientRect()
      if (!box) return
      focused.current = true
      const fit = Math.min(box.width / l.width, (box.height - 40) / l.height, 1)
      if (fit >= 0.6) ref.current?.centerView(fit, 0)
      else focus(fam.meId, { scale: box.width < 768 ? 0.75 : 0.9, ms: 0 })
    }, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 누른 사람이 패널에 가리지 않게 옮긴다
  useEffect(() => {
    if (!targetId) return
    const wide = window.innerWidth >= 768
    focus(targetId, wide ? { fx: (window.innerWidth - 400) / 2 / window.innerWidth } : { fy: 0.22 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  const via = targetId ? (rels.get(targetId)?.via ?? []) : []
  const pathLinks = (ids: string[]) => via.some((id, i) => i > 0 && ids.includes(id) && ids.includes(via[i - 1]))

  // 드래그로 화면을 옮긴 뒤 손을 뗄 때는 누른 것으로 치지 않는다
  const down = useRef({ x: 0, y: 0 })
  const moved = (e: React.MouseEvent) => Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 8

  return (
    <div
      className="paper-grain absolute inset-0"
      onPointerDownCapture={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onClickCapture={(e) => moved(e) && e.stopPropagation()}
      onClick={onBackground}
    >
      <TransformWrapper ref={ref} minScale={0.25} maxScale={2.2} initialScale={1} limitToBounds={false} doubleClick={{ disabled: true }} wheel={{ step: 0.08 }}>
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <div className="relative" style={{ width: l.width, height: l.height }}>
            <svg className="pointer-events-none absolute inset-0" width={l.width} height={l.height}>
              {l.links.map((k, i) => {
                const on = pathLinks(k.ids)
                return (
                  <g key={i}>
                    <path d={k.d} fill="none" stroke={k.kind === 'marriage' ? '#c0394b' : '#9aa3b5'} strokeOpacity={k.kind === 'marriage' ? 0.55 : 1} strokeWidth={k.kind === 'marriage' ? 2.5 : 1.5} strokeLinecap="round" />
                    {on && (
                      <motion.path
                        d={k.d}
                        fill="none"
                        stroke="#1f2433"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      />
                    )}
                  </g>
                )
              })}
            </svg>
            {l.nodes.map((n, i) => (
              <div key={n.id} id={`node-${n.id}`} className="absolute" style={{ left: n.x - NODE_W / 2, top: n.y - NODE_H / 2, width: NODE_W, height: NODE_H }}>
                <Node
                  fam={fam}
                  id={n.id}
                  index={i}
                  side={sides.get(n.id) ?? 'mine'}
                  rel={rels.get(n.id) ?? null}
                  isViewer={n.id === viewerId}
                  isTarget={n.id === targetId}
                  dim={!!targetId && !via.includes(n.id)}
                  onTap={() => onTap(n.id)}
                />
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
      <div className="absolute right-4 bottom-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
        {[
          { label: '확대', icon: '+', run: () => ref.current?.zoomIn(0.3) },
          { label: '축소', icon: '−', run: () => ref.current?.zoomOut(0.3) },
          { label: '기준 사람으로 이동', icon: '◎', run: () => focus(viewerId) },
        ].map((b) => (
          <motion.button
            key={b.label}
            type="button"
            aria-label={b.label}
            whileTap={{ scale: 0.9 }}
            onClick={b.run}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-card text-lg font-semibold shadow-[0_4px_14px_-6px_rgb(31_36_51/0.4)]"
          >
            {b.icon}
          </motion.button>
        ))}
      </div>
      <ul className="pointer-events-none absolute top-1 left-4 hidden gap-3 text-xs font-semibold text-muted md:flex" aria-label="색 구분">
        {(['mine', 'spouse', 'child'] as Side[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SIDE_STYLE[k].bar}`} />
            {SIDE_STYLE[k].label}
          </li>
        ))}
      </ul>
    </div>
  )
}
