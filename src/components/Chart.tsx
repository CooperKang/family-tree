import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { generations } from '../kin/graph'
import { relate } from '../kin/terms'
import type { Family, Side } from '../kin/types'
import { displayName } from '../store'
import { josa } from './RelationPanel'
import { SIDE_STYLE } from './ui'

const ORDER: Side[] = ['mine', 'spouse', 'child']

/** 한 사람 입장에서 모두를 뭐라고 부르는지 한 장으로 */
export default function Chart({
  fam,
  sides,
  viewerId,
  onPick,
}: {
  fam: Family
  sides: Map<string, Side>
  viewerId: string
  onPick: (id: string) => void
}) {
  const gen = useMemo(() => generations(fam), [fam])
  const viewer = fam.people[viewerId]
  const vName = displayName(fam, viewer)
  const rows = useMemo(
    () =>
      Object.values(fam.people)
        .filter((p) => p.id !== viewerId)
        .map((p) => ({ p, rel: relate(fam, viewerId, p.id)!, back: relate(fam, p.id, viewerId)! }))
        .sort((a, b) => gen.get(a.p.id)! - gen.get(b.p.id)!),
    [fam, viewerId, gen],
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 pt-5 pb-24 md:px-6">
        <AnimatePresence mode="wait">
          <motion.div key={viewerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <h2 className="font-term text-3xl font-bold">{josa(vName, '이가')} 부르는 호칭</h2>
            <p className="mt-1 text-[15px] text-muted">위의 이름을 눌러 기준을 바꿀 수 있어요. 줄을 누르면 가계도에서 보여줘요.</p>

            {ORDER.map((side) => {
              const list = rows.filter((r) => (sides.get(r.p.id) ?? 'mine') === side)
              if (!list.length) return null
              const s = SIDE_STYLE[side]
              return (
                <section key={side} className="mt-8">
                  <h3 className={`mb-2 flex items-center gap-2 text-sm font-bold ${s.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${s.bar}`} />
                    {s.label}
                  </h3>
                  <div className="overflow-hidden rounded-[20px] bg-card">
                    <div className="hidden grid-cols-[1.1fr_1.3fr_1fr_1.3fr] gap-3 border-b border-line/60 px-5 py-2.5 text-xs font-semibold text-muted md:grid">
                      <span>누구</span>
                      <span>부를 때</span>
                      <span>남에게 말할 때</span>
                      <span>그 사람이 {josa(vName, '을를')}</span>
                    </div>
                    <ul className="divide-y divide-line/50">
                      {list.map(({ p, rel, back }) => (
                        <li key={p.id}>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.985 }}
                            onClick={() => onPick(p.id)}
                            className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-5 py-3.5 text-left hover:bg-paper/60 md:grid-cols-[1.1fr_1.3fr_1fr_1.3fr]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{displayName(fam, p)}</span>
                              <span className="block text-xs text-muted">{rel.chon === null ? '' : rel.chon === 0 ? '무촌' : `${rel.chon}촌`}</span>
                            </span>
                            <span className="font-term row-span-2 text-right text-xl font-bold md:row-span-1 md:text-left">{rel.call}</span>
                            <span className="text-sm text-muted md:text-[15px] md:text-ink">{rel.known ? rel.ref : '—'}</span>
                            <span className="col-span-2 text-sm text-muted md:col-span-1 md:text-[15px]">
                              <span className="md:hidden">{josa(vName, '을를')} </span>
                              {back.call}
                            </span>
                          </motion.button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
