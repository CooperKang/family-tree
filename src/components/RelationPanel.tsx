import { motion } from 'motion/react'
import { relate, stepWord } from '../kin/terms'
import type { Family, Side } from '../kin/types'
import { displayName, PREVIEW_BABY_ID } from '../store'
import { Button, SIDE_STYLE } from './ui'

/** 받침 유무에 맞춰 조사를 고른다: 은/는, 이/가, 을/를 */
export function josa(word: string, pair: '은는' | '이가' | '을를' | '과와') {
  const last = word.charCodeAt(word.length - 1)
  const has = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
  return word + (has ? pair[0] : pair[1])
}

interface Props {
  fam: Family
  sides: Map<string, Side>
  viewerId: string
  targetId: string
  onViewAs: (id: string) => void
  onEdit: (id: string) => void
  onAdd: (id: string) => void
  onSwap: () => void
}

export default function RelationPanel({ fam, sides, viewerId, targetId, onViewAs, onEdit, onAdd, onSwap }: Props) {
  const viewer = fam.people[viewerId]
  const target = fam.people[targetId]
  const isPreview = targetId === PREVIEW_BABY_ID

  if (viewerId === targetId) {
    return (
      <div className="space-y-5 p-5 md:p-6">
        <p className="text-sm text-muted">지금 기준</p>
        <h2 className="font-term text-4xl font-bold">{displayName(fam, viewer)}</h2>
        <p className="text-[15px] leading-relaxed text-muted">
          가계도의 이름표가 모두 {josa(displayName(fam, viewer), '이가')} 부르는 호칭으로 바뀌었어요. 다른 사람을 누르면 어떻게 이어지는지 볼 수 있어요.
        </p>
        {!isPreview && (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => onAdd(targetId)}>가족 추가</Button>
            <Button onClick={() => onEdit(targetId)}>정보 고치기</Button>
          </div>
        )}
      </div>
    )
  }

  const rel = relate(fam, viewerId, targetId)!
  const back = relate(fam, targetId, viewerId)!
  const vName = displayName(fam, viewer)
  const tName = displayName(fam, target)
  const people = rel.via.map((id) => fam.people[id])
  const side = SIDE_STYLE[sides.get(targetId) ?? 'mine']

  return (
    <div className="space-y-6 p-5 md:p-6">
      <section>
        <p className="text-[15px] text-muted">
          {josa(vName, '이가')} {josa(tName, '을를')} 부를 때
        </p>
        <motion.p
          key={`${viewerId}-${targetId}`}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className={`font-term mt-1 text-[44px] leading-[1.15] font-bold ${side.text}`}
        >
          {rel.call}
        </motion.p>
        <dl className="mt-3 flex flex-wrap gap-2 text-sm">
          {rel.known && rel.ref !== rel.call && (
            <div className="rounded-full bg-paper px-3 py-1">
              <dt className="inline text-muted">남에게 말할 때 </dt>
              <dd className="inline font-semibold">{rel.ref}</dd>
            </div>
          )}
          {rel.chon !== null && (
            <div className="rounded-full bg-paper px-3 py-1">
              <dt className="sr-only">촌수</dt>
              <dd className="inline font-semibold">{rel.chon === 0 ? '무촌' : `${rel.chon}촌`}</dd>
            </div>
          )}
        </dl>
        {rel.note && <p className="mt-3 text-[15px] leading-relaxed text-muted">{rel.note}</p>}
      </section>

      {rel.path.length > 0 && (
        <section aria-label="이어지는 길">
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
            {people.map((p, i) => (
              <motion.li
                key={p.id}
                className="flex items-center gap-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
              >
                {i > 0 && <span className="px-1 text-xs text-muted">{stepWord(rel.path[i - 1], people[i - 1].gender)} →</span>}
                <span className={`rounded-lg px-2 py-1 text-sm font-semibold ${SIDE_STYLE[sides.get(p.id) ?? 'mine'].soft}`}>{displayName(fam, p)}</span>
              </motion.li>
            ))}
          </ol>
        </section>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onSwap}
        className="block w-full rounded-2xl bg-paper p-4 text-left transition-colors hover:bg-line/40"
      >
        <span className="text-sm text-muted">
          반대로 {josa(tName, '은는')} {josa(vName, '을를')}
        </span>
        <span className="font-term mt-0.5 block text-2xl font-bold">{back.call}</span>
        {back.known && back.ref !== back.call && <span className="text-sm text-muted">남에게 말할 때 {back.ref}</span>}
      </motion.button>

      <div className="grid grid-cols-2 gap-2">
        <Button tone="primary" className="col-span-2" onClick={() => onViewAs(targetId)}>
          {tName} 입장에서 모두 보기
        </Button>
        {!isPreview && (
          <>
            <Button onClick={() => onAdd(targetId)}>가족 추가</Button>
            <Button onClick={() => onEdit(targetId)}>정보 고치기</Button>
          </>
        )}
      </div>
    </div>
  )
}
