import { byAge, childrenOf, generations, parentsOf, siblingsOf, spouseOf } from './graph'
import type { Family, Person } from './types'

export const NODE_W = 104
export const NODE_H = 84
const COUPLE_GAP = 14
const GAP = 22
const FAMILY_GAP = 44
const ROW_H = 150

/** 세대(gen)별로 사람 id를 왼쪽→오른쪽 순서로 담는다 */
type Block = Map<number, string[]>

function concat(...blocks: Block[]): Block {
  const out: Block = new Map()
  for (const b of blocks) for (const [g, ids] of b) out.set(g, [...(out.get(g) ?? []), ...ids])
  return out
}
const single = (g: number, ids: string[]): Block => new Map([[g, ids]])

/**
 * 나와 배우자를 가운데 두고, 내 쪽은 왼쪽 · 배우자 쪽은 오른쪽으로 펼친다.
 * 직계 조상(pedigree)마다 그 형제들은 바깥쪽에, 본인은 안쪽 끝에 둔다.
 */
function ordering(fam: Family, gen: Map<string, number>): { all: Block; right: Set<string> } {
  const placed = new Set<string>()
  const me = fam.people[fam.meId]
  const wife = spouseOf(fam, me)

  const pedigree = new Set<string>()
  const markUp = (p: Person) => {
    pedigree.add(p.id)
    parentsOf(fam, p).forEach(markUp)
  }
  markUp(me)
  if (wife) markUp(wife)

  const couple = (p: Person): string[] => {
    placed.add(p.id)
    const sp = spouseOf(fam, p)
    if (!sp || placed.has(sp.id) || pedigree.has(sp.id)) return [p.id]
    placed.add(sp.id)
    return p.gender === 'M' ? [p.id, sp.id] : [sp.id, p.id]
  }

  const desc = (p: Person): Block => {
    if (placed.has(p.id)) return new Map()
    const row = single(gen.get(p.id)!, couple(p))
    const kids = childrenOf(fam, p).filter((k) => !placed.has(k.id) && !pedigree.has(k.id))
    return concat(row, ...kids.map(desc))
  }

  const side = (p: Person, outward: 'L' | 'R'): Block => {
    placed.add(p.id)
    const ps = parentsOf(fam, p)
    const father = ps.find((x) => x.gender === 'M')
    const mother = ps.find((x) => x.gender === 'F')
    const sibs = siblingsOf(fam, p).filter((s) => !pedigree.has(s.id)).sort(byAge)
    const self = single(gen.get(p.id)!, [p.id])
    const group = outward === 'L' ? [...sibs.map(desc), self] : [self, ...sibs.map(desc)]
    return concat(father ? side(father, 'L') : new Map(), ...group, mother ? side(mother, 'R') : new Map())
  }

  const left = side(me, 'L')
  const right = wife ? side(wife, 'R') : new Map()
  const ours = childrenOf(fam, me).filter((k) => !placed.has(k.id))
  let all = concat(left, ...ours.map(desc), right)

  // 위 규칙으로 닿지 않은 사람 (예: 형제 배우자의 부모)은 해당 세대 끝에 둔다
  const rest = Object.values(fam.people).filter((p) => !placed.has(p.id) && !pedigree.has(p.id))
  for (const p of rest) if (!placed.has(p.id)) all = concat(all, desc(p))
  return { all, right: new Set([...right.values()].flat()) }
}

interface Unit {
  ids: string[]
  x: number
  w: number
  /** 형제 묶음 (같은 부모) 키 */
  fam: string
}

/** 순서와 최소 간격을 지키며 원하는 위치에 최대한 가깝게 (pool adjacent violators) */
function fit(units: Unit[], desired: number[], gaps: number[]) {
  const c: number[] = []
  let acc = 0
  for (let i = 0; i < units.length; i++) {
    if (i > 0) acc += units[i - 1].w + gaps[i]
    c.push(acc)
  }
  const blocks: { sum: number; n: number }[] = []
  for (let i = 0; i < units.length; i++) {
    blocks.push({ sum: desired[i] - c[i], n: 1 })
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1]
      const a = blocks[blocks.length - 2]
      if (a.sum / a.n <= b.sum / b.n) break
      blocks.pop()
      a.sum += b.sum
      a.n += b.n
    }
  }
  let i = 0
  for (const b of blocks) for (let k = 0; k < b.n; k++, i++) units[i].x = b.sum / b.n + c[i]
}

export interface Placed {
  id: string
  x: number
  y: number
}
export interface Link {
  kind: 'marriage' | 'child'
  d: string
  ids: string[]
}
export interface TreeLayout {
  nodes: Placed[]
  links: Link[]
  width: number
  height: number
}

export function layout(fam: Family): TreeLayout {
  const gen = generations(fam)
  const { all: order, right } = ordering(fam, gen)
  const gens = [...order.keys()].sort((a, b) => a - b)
  const famKey = (p: Person) => [...p.parentIds].sort().join('+')

  // 줄마다 부부를 한 덩어리로 묶는다
  const rows = new Map<number, Unit[]>()
  for (const g of gens) {
    const ids = order.get(g)!
    const units: Unit[] = []
    for (let i = 0; i < ids.length; i++) {
      const p = fam.people[ids[i]]
      const next = ids[i + 1]
      const q = next ? fam.people[next] : undefined
      // 둘 다 부모가 있는 부부(나와 배우자처럼 두 집안을 잇는 부부)는 각자 자기 형제 쪽으로 움직일 수 있게 따로 둔다
      if (q && p.spouseId === q.id && !(p.parentIds.length && q.parentIds.length)) {
        units.push({ ids: [p.id, next], x: 0, w: NODE_W * 2 + COUPLE_GAP, fam: famKey(p) || famKey(q) })
        i++
      } else units.push({ ids: [p.id], x: 0, w: NODE_W, fam: famKey(p) })
    }
    rows.set(g, units)
  }
  const gapsOf = (units: Unit[]) =>
    units.map((u, i) => {
      if (i === 0) return 0
      const prev = units[i - 1]
      if (fam.people[prev.ids[prev.ids.length - 1]].spouseId === u.ids[0]) return COUPLE_GAP
      return u.fam && u.fam === prev.fam ? GAP : FAMILY_GAP
    })

  const xOf = new Map<string, number>()
  const sync = () => {
    for (const units of rows.values())
      for (const u of units) u.ids.forEach((id, k) => xOf.set(id, u.x + k * (NODE_W + COUPLE_GAP) + NODE_W / 2))
  }
  for (const units of rows.values()) fit(units, units.map(() => 0), gapsOf(units))
  sync()

  const center = (ids: string[]) => {
    const xs = ids.map((id) => xOf.get(id)).filter((x): x is number => x !== undefined)
    return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : undefined
  }

  // 아래로: 형제 묶음을 부모 가운데로 / 위로: 부모를 자녀 묶음 가운데로
  const down = (g: number) => {
    const units = rows.get(g)!
    const groups = new Map<string, Unit[]>()
    for (const u of units) if (u.fam) groups.set(u.fam, [...(groups.get(u.fam) ?? []), u])
    const desired = units.map((u) => u.x)
    for (const [key, us] of groups) {
      const target = center(key.split('+'))
      if (target === undefined) continue
      const now = (us[0].x + us[us.length - 1].x + us[us.length - 1].w) / 2
      us.forEach((u) => (desired[units.indexOf(u)] = u.x + target - now))
    }
    fit(units, desired, gapsOf(units))
    sync()
  }
  const up = (g: number) => {
    const units = rows.get(g)!
    const desired = units.map((u) => {
      const kids = u.ids.flatMap((id) => childrenOf(fam, fam.people[id]).map((k) => k.id))
      const c = center(kids)
      return c === undefined ? u.x : c - u.w / 2
    })
    fit(units, desired, gapsOf(units))
    sync()
  }
  for (let it = 0; it < 6; it++) {
    for (const g of gens) down(g)
    for (const g of [...gens].reverse()) up(g)
  }
  for (const g of gens) down(g)

  // 배우자 집안 전체를 우리 집 쪽으로 붙인다 (두 집안 사이 빈 공간 없애기)
  let shift = Infinity
  for (const units of rows.values()) {
    const l = units.filter((u) => !right.has(u.ids[0]))
    const r = units.filter((u) => right.has(u.ids[0]))
    if (!l.length || !r.length) continue
    const lEdge = Math.max(...l.map((u) => u.x + u.w))
    const rEdge = Math.min(...r.map((u) => u.x))
    shift = Math.min(shift, rEdge - lEdge - FAMILY_GAP)
  }
  if (shift > 0 && shift < Infinity) {
    for (const units of rows.values()) for (const u of units) if (right.has(u.ids[0])) u.x -= shift
    sync()
    for (const g of gens) if (g > 0) down(g)
  }

  const minX = Math.min(...[...xOf.values()]) - NODE_W / 2
  const minG = gens[0]
  const pos = new Map<string, { x: number; y: number }>()
  for (const [id, x] of xOf) pos.set(id, { x: x - minX + 40, y: (gen.get(id)! - minG) * ROW_H + 40 + NODE_H / 2 })

  const links: Link[] = []
  const seen = new Set<string>()
  for (const p of Object.values(fam.people)) {
    const sp = spouseOf(fam, p)
    if (!sp || seen.has(sp.id)) continue
    seen.add(p.id)
    const a = pos.get(p.id)!
    const b = pos.get(sp.id)!
    const [l, r] = a.x < b.x ? [a, b] : [b, a]
    const adjacent = r.x - l.x <= NODE_W + COUPLE_GAP + 1
    const d = adjacent
      ? `M${l.x + NODE_W / 2},${l.y} H${r.x - NODE_W / 2}`
      : `M${l.x},${l.y + NODE_H / 2} V${l.y + NODE_H / 2 + 14} H${r.x} V${r.y + NODE_H / 2}`
    links.push({ kind: 'marriage', d, ids: [p.id, sp.id] })
  }

  const byFam = new Map<string, Person[]>()
  for (const p of Object.values(fam.people)) {
    if (!p.parentIds.length) continue
    const k = famKey(p)
    byFam.set(k, [...(byFam.get(k) ?? []), p])
  }
  for (const [key, kids] of byFam) {
    const ps = key.split('+').map((id) => pos.get(id)!).filter(Boolean)
    if (!ps.length) continue
    const px = ps.reduce((s, p) => s + p.x, 0) / ps.length
    const adjacent = ps.length === 2 && Math.abs(ps[0].x - ps[1].x) <= NODE_W + COUPLE_GAP + 1
    const py = ps.length === 2 && !adjacent ? ps[0].y + NODE_H / 2 + 14 : ps[0].y + (ps.length === 2 ? 0 : NODE_H / 2)
    const ks = kids.map((k) => ({ id: k.id, ...pos.get(k.id)! }))
    const busY = ks[0].y - NODE_H / 2 - 22
    const xs = [px, ...ks.map((k) => k.x)]
    let d = `M${px},${py} V${busY} M${Math.min(...xs)},${busY} H${Math.max(...xs)}`
    for (const k of ks) d += ` M${k.x},${busY} V${k.y - NODE_H / 2}`
    links.push({ kind: 'child', d, ids: [...key.split('+'), ...kids.map((k) => k.id)] })
  }

  const xs = [...pos.values()].map((p) => p.x)
  const ys = [...pos.values()].map((p) => p.y)
  return {
    nodes: [...pos].map(([id, p]) => ({ id, ...p })),
    links,
    width: Math.max(...xs) + NODE_W / 2 + 40,
    height: Math.max(...ys) + NODE_H / 2 + 40,
  }
}
