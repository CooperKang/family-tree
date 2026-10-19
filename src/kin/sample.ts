import { addRelative, createFamily, type AddKind, type PersonInput } from './ops'
import type { Family } from './types'

/** 예시 가족. 화면 둘러보기와 테스트에 같이 쓴다. */
export function sampleFamily() {
  let fam: Family = createFamily({ name: '김지훈', gender: 'M', birthYear: 1992 }, { name: '이수아', gender: 'F', birthYear: 1994 })
  const ids: Record<string, string> = { me: fam.meId, wife: fam.people[fam.meId].spouseId! }
  const add = (key: string, anchor: string, kind: AddKind, input: PersonInput) => {
    const r = addRelative(fam, ids[anchor], kind, input)
    fam = r.fam
    ids[key] = r.id
  }

  // 우리 집
  add('father', 'me', 'father', { name: '김영수', gender: 'M', birthYear: 1962 })
  add('mother', 'me', 'mother', { name: '박미영', gender: 'F', birthYear: 1965 })
  add('gf', 'father', 'father', { name: '김철호', gender: 'M', birthYear: 1935 })
  add('gm', 'father', 'mother', { name: '정순자', gender: 'F', birthYear: 1938 })
  add('mgf', 'mother', 'father', { name: '박만석', gender: 'M', birthYear: 1937 })
  add('mgm', 'mother', 'mother', { name: '이옥자', gender: 'F', birthYear: 1940 })
  add('uncle1', 'father', 'olderSibling', { name: '김영철', gender: 'M', birthYear: 1955 })
  add('uncle1w', 'uncle1', 'spouse', { name: '최정희', gender: 'F', birthYear: 1957 })
  add('uncle2', 'father', 'olderSibling', { name: '김영호', gender: 'M', birthYear: 1958 })
  add('uncle2w', 'uncle2', 'spouse', { name: '윤명숙', gender: 'F', birthYear: 1960 })
  add('aunt', 'father', 'youngerSibling', { name: '김영희', gender: 'F', birthYear: 1966 })
  add('auntH', 'aunt', 'spouse', { name: '조성민', gender: 'M', birthYear: 1964 })
  add('uncle3', 'father', 'youngerSibling', { name: '김영민', gender: 'M', birthYear: 1970 })
  add('cousin1', 'uncle1', 'child', { name: '김민수', gender: 'M', birthYear: 1983 })
  add('cousin2', 'aunt', 'child', { name: '조하은', gender: 'F', birthYear: 1996 })
  add('mUncle', 'mother', 'youngerSibling', { name: '박준호', gender: 'M', birthYear: 1968 })
  add('mUncleW', 'mUncle', 'spouse', { name: '한지연', gender: 'F', birthYear: 1970 })
  add('mAunt', 'mother', 'olderSibling', { name: '박미숙', gender: 'F', birthYear: 1960 })
  add('mAuntH', 'mAunt', 'spouse', { name: '서동훈', gender: 'M', birthYear: 1958 })
  add('sister', 'me', 'olderSibling', { name: '김지은', gender: 'F', birthYear: 1989 })
  add('sisterH', 'sister', 'spouse', { name: '정우성', gender: 'M', birthYear: 1987 })
  add('niece', 'sister', 'child', { name: '정서윤', gender: 'F', birthYear: 2021 })
  add('brother', 'me', 'youngerSibling', { name: '김지호', gender: 'M', birthYear: 1995 })

  // 아내 집
  add('wFather', 'wife', 'father', { name: '이정민', gender: 'M', birthYear: 1963 })
  add('wMother', 'wife', 'mother', { name: '강혜숙', gender: 'F', birthYear: 1966 })
  add('wBro', 'wife', 'olderSibling', { name: '이준혁', gender: 'M', birthYear: 1990 })
  add('wBroW', 'wBro', 'spouse', { name: '송다은', gender: 'F', birthYear: 1991 })
  add('wSis', 'wife', 'youngerSibling', { name: '이수빈', gender: 'F', birthYear: 1997 })
  add('wUncle', 'wFather', 'youngerSibling', { name: '이정훈', gender: 'M', birthYear: 1967 })
  add('wUncleW', 'wUncle', 'spouse', { name: '오미란', gender: 'F', birthYear: 1969 })
  add('wAunt', 'wMother', 'olderSibling', { name: '강혜련', gender: 'F', birthYear: 1962 })

  return { fam, ids }
}
