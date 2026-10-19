import { motion } from 'motion/react'
import { useMemo } from 'react'
import { childrenOf, generations, parentsOf } from '../kin/graph'
import type { AddKind } from '../kin/ops'
import { relate } from '../kin/terms'
import type { Family, Person, Side } from '../kin/types'
import { displayName } from '../store'
import { SIDE_STYLE } from './ui'

interface Quick {
  label: string
  anchor?: Person
  kind: AddKind
  needs: string
}

function quickFor(fam: Family, base: Person | undefined, baseLabel: string): Quick[] {
  if (!base) return []
  const ps = parentsOf(fam, base).filter((p) => !p.placeholder)
  const father = ps.find((p) => p.gender === 'M')
  const mother = ps.find((p) => p.gender === 'F')
  const o = base.gender === 'M' ? '형 · 누나' : '오빠 · 언니'
  return [
    { label: `${baseLabel} 아버지`, anchor: base, kind: 'father', needs: '' },
    { label: `${baseLabel} 어머니`, anchor: base, kind: 'mother', needs: '' },
    { label: `${baseLabel} ${o}`, anchor: base, kind: 'olderSibling', needs: '' },
    { label: `${baseLabel} 동생`, anchor: base, kind: 'youngerSibling', needs: '' },
    { label: '아버지의 형제', anchor: father, kind: 'olderSibling', needs: '아버지' },
    { label: '어머니의 형제', anchor: mother, kind: 'olderSibling', needs: '어머니' },
    { label: '친가 조부모', anchor: father, kind: 'father', needs: '아버지' },
    { label: '외가 조부모', anchor: mother, kind: 'father', needs: '어머니' },
  ]
}

function Column({
  fam,
  side,
  title,
  people,
  quick,
  gen,
  onAdd,
  onEdit,
  spouseView,
}: {
  fam: Family
  side: Side
  title: string
  people: Person[]
  quick: Quick[]
  gen: Map<string, number>
  onAdd: (anchorId: string, kind?: AddKind) => void
  onEdit: (id: string) => void
  spouseView?: Person
}) {
  const s = SIDE_STYLE[side]
  const sorted = [...people].sort((a, b) => gen.get(a.id)! - gen.get(b.id)! || (a.birthYear ?? 9999) - (b.birthYear ?? 9999))
  return (
    <section className="rounded-[24px] bg-card p-5 md:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className={`h-3 w-3 rounded-full ${s.bar}`} />
        {title}
        <span className="text-sm font-medium text-muted">{people.length}명</span>
      </h2>

      {quick.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {quick.map((q) => (
            <motion.button
              key={q.label}
              type="button"
              whileTap={{ scale: 0.94 }}
              disabled={!q.anchor}
              title={q.anchor ? undefined : `${q.needs}를 먼저 추가해 주세요`}
              onClick={() => q.anchor && onAdd(q.anchor.id, q.kind)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-35 ${s.soft} ${s.text} hover:brightness-95`}
            >
              + {q.label}
            </motion.button>
          ))}
        </div>
      )}

      <ul className="mt-5 divide-y divide-line/50">
        {sorted.map((p) => {
          const fromMe = relate(fam, fam.meId, p.id)
          const fromSpouse = spouseView && spouseView.id !== p.id ? relate(fam, spouseView.id, p.id) : null
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onEdit(p.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-paper/60">
                <span className={`h-9 w-1 shrink-0 rounded-full ${s.bar} ${p.placeholder ? 'opacity-30' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {p.name || <span className="text-muted">이름 없음</span>}
                    {p.unborn && <span className="ml-1.5 text-xs font-medium text-nori">태어날 아기</span>}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {p.birthYear ? `${p.birthYear}년생` : '출생년도 없음'}
                    {fromSpouse && ` · ${displayName(fam, spouseView!)}에게 ${fromSpouse.ref}`}
                  </span>
                </span>
                <span className="font-term shrink-0 text-right text-[17px] font-bold">{p.id === fam.meId ? '나' : fromMe?.ref}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Register({ fam, sides, onAdd, onEdit }: { fam: Family; sides: Map<string, Side>; onAdd: (anchorId: string, kind?: AddKind) => void; onEdit: (id: string) => void }) {
  const me = fam.people[fam.meId]
  const spouse = me.spouseId ? fam.people[me.spouseId] : undefined
  const gen = useMemo(() => generations(fam), [fam])
  const bySide = (side: Side) => Object.values(fam.people).filter((p) => sides.get(p.id) === side)
  const spouseWord = me.gender === 'M' ? '아내' : '남편'
  const kids = childrenOf(fam, me)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 md:px-6">
        <p className="mb-5 max-w-xl text-[15px] leading-relaxed text-muted">
          버튼으로 가족을 추가하고, 이름을 누르면 고칠 수 있어요. 형제 순서나 사촌끼리 나이 비교는 출생년도로 정해지니 아는 만큼 넣어 주세요.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Column fam={fam} side="mine" title="우리 집" people={bySide('mine')} quick={quickFor(fam, me, '내')} gen={gen} onAdd={onAdd} onEdit={onEdit} />
          {spouse ? (
            <Column
              fam={fam}
              side="spouse"
              title={`${spouseWord}네 집`}
              people={bySide('spouse')}
              quick={quickFor(fam, spouse, spouseWord)}
              gen={gen}
              onAdd={onAdd}
              onEdit={onEdit}
              spouseView={spouse}
            />
          ) : (
            <section className="flex flex-col items-start justify-center gap-3 rounded-[24px] border-2 border-dashed border-line p-6">
              <p className="font-semibold">배우자를 추가하면 양가 가계도가 이어져요</p>
              <button type="button" onClick={() => onAdd(me.id, 'spouse')} className="rounded-full bg-hong-soft px-4 py-2 text-sm font-semibold text-hong">
                + 배우자 추가
              </button>
            </section>
          )}
          <div className="md:col-span-2">
            <Column
              fam={fam}
              side="child"
              title="우리 아이"
              people={bySide('child')}
              quick={[{ label: kids.length ? '아이 추가' : '아기 추가 (태어날 아기도)', anchor: me, kind: 'child', needs: '' }]}
              gen={gen}
              onAdd={onAdd}
              onEdit={onEdit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
