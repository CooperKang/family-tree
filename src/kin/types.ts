export type Gender = 'M' | 'F'

/** 나(ego) 기준으로 어느 집안 사람인지 */
export type Side = 'mine' | 'spouse' | 'child'

export interface Person {
  id: string
  name: string
  gender: Gender
  birthYear?: number
  /** 형제자매 사이 순서. 출생년도가 없거나 같을 때 나이 비교에 쓴다. 작을수록 손위. */
  order: number
  parentIds: string[]
  spouseId?: string
  /** 이름 없이 관계만 잇기 위해 자동으로 만든 사람 (예: 큰아버지를 추가하면 생기는 할아버지) */
  placeholder?: boolean
  /** 아직 태어나지 않은 아기 */
  unborn?: boolean
  married?: boolean
}

export interface Family {
  meId: string
  people: Record<string, Person>
}

/**
 * 관계 경로의 한 걸음.
 * F/M 아버지/어머니, S/D 아들/딸, H/W 남편/아내,
 * eB/yB/eZ/yZ 형제자매(e: 손위, y: 손아래)
 */
export type Step = 'F' | 'M' | 'S' | 'D' | 'H' | 'W' | 'eB' | 'yB' | 'eZ' | 'yZ'

export interface Term {
  /** 부를 때 (호칭) */
  call: string
  /** 남에게 말할 때 (지칭) */
  ref: string
  note?: string
}

export interface Relation extends Term {
  path: Step[]
  /** 거쳐가는 사람 id (viewer 포함, target 포함) */
  via: string[]
  chon: number | null
  known: boolean
}
