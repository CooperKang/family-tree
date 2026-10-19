import { byAge, parentsOf, siblingsOf } from './graph'
import type { Family, Gender, Person } from './types'

export type AddKind = 'father' | 'mother' | 'olderSibling' | 'youngerSibling' | 'spouse' | 'child'

export interface PersonInput {
  name: string
  gender: Gender
  birthYear?: number
  unborn?: boolean
}

let seq = 0
export const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

const blank = (input: PersonInput, extra: Partial<Person> = {}): Person => ({
  id: newId(),
  name: input.name.trim(),
  gender: input.gender,
  birthYear: input.birthYear || undefined,
  unborn: input.unborn || undefined,
  order: 0,
  parentIds: [],
  ...extra,
})

export function createFamily(me: PersonInput, spouse?: PersonInput): Family {
  const m = blank(me)
  const fam: Family = { meId: m.id, people: { [m.id]: m } }
  return spouse?.name.trim() ? addRelative(fam, m.id, 'spouse', spouse).fam : fam
}

const clone = (fam: Family): Family => ({
  meId: fam.meId,
  people: Object.fromEntries(Object.entries(fam.people).map(([k, p]) => [k, { ...p, parentIds: [...p.parentIds] }])),
})

/** 형제를 이으려면 부모가 있어야 하므로, 없으면 이름 없는 부모를 만든다 */
function ensureParents(fam: Family, p: Person) {
  const ps = parentsOf(fam, p)
  if (ps.length) return
  const f = blank({ name: '', gender: 'M' }, { placeholder: true })
  const m = blank({ name: '', gender: 'F' }, { placeholder: true })
  f.spouseId = m.id
  m.spouseId = f.id
  fam.people[f.id] = f
  fam.people[m.id] = m
  p.parentIds = [f.id, m.id]
}

export function addRelative(src: Family, anchorId: string, kind: AddKind, input: PersonInput): { fam: Family; id: string } {
  const fam = clone(src)
  const anchor = fam.people[anchorId]

  if (kind === 'father' || kind === 'mother') {
    const gender: Gender = kind === 'father' ? 'M' : 'F'
    const existing = parentsOf(fam, anchor).find((p) => p.gender === gender)
    if (existing) {
      if (!existing.placeholder) throw new Error(`이미 ${kind === 'father' ? '아버지' : '어머니'}가 있어요`)
      Object.assign(existing, { name: input.name.trim(), birthYear: input.birthYear || undefined, placeholder: undefined })
      return { fam, id: existing.id }
    }
    const p = blank({ ...input, gender })
    fam.people[p.id] = p
    const other = parentsOf(fam, anchor)[0]
    if (other && !other.spouseId) {
      other.spouseId = p.id
      p.spouseId = other.id
    }
    // 같은 부모를 둔 형제들도 함께 잇는다
    const kids = other ? Object.values(fam.people).filter((c) => c.parentIds.includes(other.id)) : [anchor]
    for (const c of kids) if (c.parentIds.length < 2) c.parentIds.push(p.id)
    return { fam, id: p.id }
  }

  if (kind === 'spouse') {
    if (anchor.spouseId) throw new Error('이미 배우자가 있어요')
    const p = blank(input, { spouseId: anchor.id })
    anchor.spouseId = p.id
    fam.people[p.id] = p
    return { fam, id: p.id }
  }

  if (kind === 'child') {
    const parents = [anchor.id, ...(anchor.spouseId ? [anchor.spouseId] : [])]
    const kids = Object.values(fam.people).filter((c) => c.parentIds.includes(anchor.id))
    const p = blank(input, { parentIds: parents, order: kids.length ? Math.max(...kids.map((k) => k.order)) + 1 : 0 })
    fam.people[p.id] = p
    return { fam, id: p.id }
  }

  // 형제자매
  ensureParents(fam, anchor)
  const group = [anchor, ...siblingsOf(fam, anchor)].sort(byAge)
  const p = blank(input, { parentIds: [...anchor.parentIds] })
  fam.people[p.id] = p
  const at = group.indexOf(anchor) + (kind === 'olderSibling' ? 0 : 1)
  group.splice(at, 0, p)
  group.forEach((g, i) => (g.order = i))
  return { fam, id: p.id }
}

export function updatePerson(src: Family, id: string, patch: Partial<Person>): Family {
  const fam = clone(src)
  Object.assign(fam.people[id], patch)
  if (patch.name) fam.people[id].placeholder = undefined
  return fam
}

/** 형제 사이 순서를 한 칸 옮긴다 (-1: 손위로, +1: 손아래로) */
export function moveOrder(src: Family, id: string, dir: -1 | 1): Family {
  const fam = clone(src)
  const p = fam.people[id]
  const group = [p, ...siblingsOf(fam, p)].sort((a, b) => a.order - b.order)
  const i = group.indexOf(p)
  const j = i + dir
  if (j < 0 || j >= group.length) return src
  ;[group[i], group[j]] = [group[j], group[i]]
  group.forEach((g, k) => (g.order = k))
  return fam
}

export function removePerson(src: Family, id: string): Family {
  if (id === src.meId) return src
  const fam = clone(src)
  delete fam.people[id]
  for (const p of Object.values(fam.people)) {
    p.parentIds = p.parentIds.filter((x) => x !== id)
    if (p.spouseId === id) p.spouseId = undefined
  }
  // 더 이상 형제를 잇는 역할을 하지 않는 이름 없는 부모는 정리
  for (let changed = true; changed; ) {
    changed = false
    for (const p of Object.values(fam.people)) {
      if (!p.placeholder || p.parentIds.length) continue
      const kids = Object.values(fam.people).filter((c) => c.parentIds.includes(p.id))
      const spouse = p.spouseId ? fam.people[p.spouseId] : undefined
      if (kids.length > 1 || (spouse && !spouse.placeholder)) continue
      delete fam.people[p.id]
      for (const q of Object.values(fam.people)) {
        q.parentIds = q.parentIds.filter((x) => x !== p.id)
        if (q.spouseId === p.id) q.spouseId = undefined
      }
      changed = true
    }
  }
  return fam
}
