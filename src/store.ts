import { useCallback, useEffect, useMemo, useState } from 'react'
import { addRelative, type AddKind, type PersonInput } from './kin/ops'
import { relate } from './kin/terms'
import type { Family, Gender, Person, Side } from './kin/types'

const KEY = 'hoching.family.v1'

function load(): Family | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Family) : null
  } catch {
    return null
  }
}

export function useFamily() {
  const [fam, setFam] = useState<Family | null>(load)
  useEffect(() => {
    try {
      if (fam) localStorage.setItem(KEY, JSON.stringify(fam))
      else localStorage.removeItem(KEY)
    } catch {
      /* 저장소를 못 쓰면 이번 방문 동안만 유지 */
    }
  }, [fam])
  return [fam, setFam] as const
}

export const PREVIEW_BABY_ID = '__baby__'

/** 아직 아기가 없을 때 "아기 시점"을 보기 위한 임시 가족 */
export function withPreviewBaby(fam: Family, gender: Gender): Family {
  const me = fam.people[fam.meId]
  const r = addRelative(fam, me.id, 'child', { name: '', gender, unborn: true } satisfies PersonInput)
  const baby = { ...r.fam.people[r.id], id: PREVIEW_BABY_ID }
  const people = { ...r.fam.people }
  delete people[r.id]
  people[PREVIEW_BABY_ID] = baby
  return { ...r.fam, people }
}

export function sideOf(fam: Family, id: string): Side {
  if (id === fam.meId) return 'mine'
  const rel = relate(fam, fam.meId, id)
  if (!rel || !rel.path.length) return 'mine'
  if (rel.path.every((s) => s === 'S' || s === 'D')) return 'child'
  return rel.path[0] === 'H' || rel.path[0] === 'W' ? 'spouse' : 'mine'
}

export function useSides(fam: Family) {
  return useMemo(() => {
    const m = new Map<string, Side>()
    for (const id of Object.keys(fam.people)) m.set(id, sideOf(fam, id))
    return m
  }, [fam])
}

/** 이름이 없으면 나 기준 호칭으로 보여준다 */
export function displayName(fam: Family, p: Person) {
  if (p.name) return p.name
  if (p.unborn || p.id === PREVIEW_BABY_ID) return '아기'
  return relate(fam, fam.meId, p.id)?.ref ?? '이름 없음'
}

export function useAdd(setFam: (f: Family) => void, fam: Family) {
  return useCallback(
    (anchorId: string, kind: AddKind, input: PersonInput) => {
      const r = addRelative(fam, anchorId, kind, input)
      setFam(r.fam)
      return r.id
    },
    [fam, setFam],
  )
}
