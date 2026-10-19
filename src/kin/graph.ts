import type { Family, Person, Step } from './types'

export const parentsOf = (fam: Family, p: Person) =>
  p.parentIds.map((id) => fam.people[id]).filter(Boolean)

export const childrenOf = (fam: Family, p: Person) =>
  Object.values(fam.people)
    .filter((c) => c.parentIds.includes(p.id))
    .sort(byAge)

export const spouseOf = (fam: Family, p: Person) => (p.spouseId ? fam.people[p.spouseId] : undefined)

export const siblingsOf = (fam: Family, p: Person) => {
  if (p.parentIds.length === 0) return []
  return Object.values(fam.people)
    .filter((s) => s.id !== p.id && s.parentIds.some((id) => p.parentIds.includes(id)))
    .sort(byAge)
}

/** a가 b보다 손위면 true, 손아래면 false, 알 수 없으면 undefined */
export function isOlder(a: Person, b: Person): boolean | undefined {
  if (a.unborn !== b.unborn) return !a.unborn
  if (a.birthYear && b.birthYear && a.birthYear !== b.birthYear) return a.birthYear < b.birthYear
  const sharesParent = a.parentIds.some((id) => b.parentIds.includes(id))
  if (sharesParent) return a.order === b.order ? a.id < b.id : a.order < b.order
  return undefined
}

/** 나이순(손위가 앞) 정렬. 출생년도가 둘 다 있으면 그걸, 아니면 순서를 쓴다. */
export function byAge(a: Person, b: Person) {
  if (a.birthYear && b.birthYear && a.birthYear !== b.birthYear) return a.birthYear - b.birthYear
  return a.order - b.order || (a.id < b.id ? -1 : 1)
}

interface Edge {
  step: Step
  to: Person
}

function edges(fam: Family, p: Person): Edge[] {
  const out: Edge[] = []
  for (const par of parentsOf(fam, p)) out.push({ step: par.gender === 'M' ? 'F' : 'M', to: par })
  for (const sib of siblingsOf(fam, p)) {
    const older = isOlder(sib, p) ?? false
    out.push({ step: `${older ? 'e' : 'y'}${sib.gender === 'M' ? 'B' : 'Z'}` as Step, to: sib })
  }
  for (const c of childrenOf(fam, p)) out.push({ step: c.gender === 'M' ? 'S' : 'D', to: c })
  const sp = spouseOf(fam, p)
  if (sp) out.push({ step: sp.gender === 'M' ? 'H' : 'W', to: sp })
  return out
}

/** viewer에서 target까지 가장 짧은 관계 경로 (BFS) */
export function findPath(fam: Family, viewerId: string, targetId: string): { steps: Step[]; via: string[] } | null {
  if (viewerId === targetId) return { steps: [], via: [viewerId] }
  const prev = new Map<string, { from: string; step: Step }>()
  const seen = new Set([viewerId])
  let frontier = [viewerId]
  while (frontier.length) {
    const next: string[] = []
    for (const id of frontier) {
      for (const e of edges(fam, fam.people[id])) {
        if (seen.has(e.to.id)) continue
        seen.add(e.to.id)
        prev.set(e.to.id, { from: id, step: e.step })
        if (e.to.id === targetId) {
          const steps: Step[] = []
          const via = [targetId]
          let cur = targetId
          while (cur !== viewerId) {
            const p = prev.get(cur)!
            steps.unshift(p.step)
            via.unshift(p.from)
            cur = p.from
          }
          return { steps, via }
        }
        next.push(e.to.id)
      }
    }
    frontier = next
  }
  return null
}

/** 촌수. 부모·자식 1촌, 형제 2촌, 배우자는 0(무촌)이고 배우자 쪽은 배우자의 촌수를 따른다. */
export function chonOf(steps: Step[]): number {
  return steps.reduce((n, s) => n + (s === 'H' || s === 'W' ? 0 : s.length === 2 ? 2 : 1), 0)
}

/** 나를 기준으로 세대 차이 (부모 -1, 자녀 +1) */
export function generations(fam: Family): Map<string, number> {
  const gen = new Map<string, number>([[fam.meId, 0]])
  const queue = [fam.meId]
  while (queue.length) {
    const id = queue.shift()!
    const p = fam.people[id]
    const g = gen.get(id)!
    for (const e of edges(fam, p)) {
      if (gen.has(e.to.id)) continue
      const d = e.step === 'F' || e.step === 'M' ? -1 : e.step === 'S' || e.step === 'D' ? 1 : 0
      gen.set(e.to.id, g + d)
      queue.push(e.to.id)
    }
  }
  for (const id of Object.keys(fam.people)) if (!gen.has(id)) gen.set(id, 0)
  return gen
}
