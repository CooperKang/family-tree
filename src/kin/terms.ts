import { chonOf, findPath, isOlder, siblingsOf } from './graph'
import type { Family, Gender, Person, Relation, Step, Term } from './types'

interface Ctx {
  fam: Family
  viewer: Person
  target: Person
  /** 경로 위 사람들 (0 = viewer, 마지막 = target) */
  people: Person[]
  /** people[i]가 people[j]보다 손위인가 */
  older: (i: number, j: number) => boolean | undefined
}

type Entry = Term | ((c: Ctx) => Term)

const t = (call: string, ref = call, note?: string): Term => ({ call, ref, note })

const married = (p: Person) => !!p.spouseId || !!p.married

// 키: "<viewer 성별 m|f|*>:<경로>". 형제 나이(e/y)를 지운 키로도 한 번 더 찾는다.
const TABLE: Record<string, Entry> = {
  // 직계
  '*:F': t('아빠, 아버지', '아버지'),
  '*:M': t('엄마, 어머니', '어머니'),
  '*:S': t('{이름}', '아들'),
  '*:D': t('{이름}', '딸'),
  'm:W': t('여보, 자기', '아내'),
  'f:H': t('여보, 자기', '남편'),
  'm:eB': t('형'),
  'm:yB': t('{이름}', '남동생'),
  'm:eZ': t('누나'),
  'm:yZ': t('{이름}', '여동생'),
  'f:eB': t('오빠'),
  'f:yB': t('{이름}', '남동생'),
  'f:eZ': t('언니'),
  'f:yZ': t('{이름}', '여동생'),

  '*:F.F': t('할아버지', '친할아버지'),
  '*:F.M': t('할머니', '친할머니'),
  '*:M.F': t('외할아버지'),
  '*:M.M': t('외할머니'),
  '*:F.F.F': t('증조할아버지'),
  '*:F.F.M': t('증조할머니'),
  '*:F.M.F': t('증조할아버지', '진외증조할아버지', '아버지의 외할아버지예요'),
  '*:F.M.M': t('증조할머니', '진외증조할머니', '아버지의 외할머니예요'),
  '*:M.F.F': t('외증조할아버지'),
  '*:M.F.M': t('외증조할머니'),
  '*:M.M.F': t('외증조할아버지', '외외증조할아버지', '어머니의 외할아버지예요'),
  '*:M.M.M': t('외증조할머니', '외외증조할머니', '어머니의 외할머니예요'),
  '*:S.S': t('{이름}', '손자'),
  '*:S.D': t('{이름}', '손녀'),
  '*:D.S': t('{이름}', '외손자'),
  '*:D.D': t('{이름}', '외손녀'),
  '*:S.S.S': t('{이름}', '증손자'),
  '*:S.S.D': t('{이름}', '증손녀'),
  '*:S.D.S': t('{이름}', '외증손자'),
  '*:S.D.D': t('{이름}', '외증손녀'),
  '*:D.S.S': t('{이름}', '외증손자'),
  '*:D.S.D': t('{이름}', '외증손녀'),
  '*:D.D.S': t('{이름}', '외증손자'),
  '*:D.D.D': t('{이름}', '외증손녀'),

  // 형제자매의 배우자
  'm:eB.W': t('형수님', '형수'),
  'm:yB.W': t('제수씨', '제수'),
  'm:eZ.H': t('매형', '매형', '자형이라고도 해요'),
  'm:yZ.H': t('매제, {성}서방', '매제'),
  'f:eB.W': t('새언니', '올케'),
  'f:yB.W': t('올케', '올케'),
  'f:eZ.H': t('형부'),
  'f:yZ.H': t('제부, {성}서방', '제부'),

  // 형제자매의 자녀와 그 배우자
  '*:B.S': t('{이름}', '조카'),
  '*:B.D': t('{이름}', '조카딸'),
  '*:Z.S': t('{이름}', '조카', '누이의 아들은 생질이라고도 해요'),
  '*:Z.D': t('{이름}', '조카딸', '누이의 딸은 생질녀라고도 해요'),
  '*:B.S.W': t('아가, 질부', '조카며느리'),
  '*:Z.S.W': t('아가, 질부', '조카며느리'),
  '*:B.D.H': t('{성}서방', '조카사위'),
  '*:Z.D.H': t('{성}서방', '조카사위', '생질서라고도 해요'),
  '*:B.S.S': t('{이름}', '종손자'),
  '*:B.S.D': t('{이름}', '종손녀'),
  '*:B.D.S': t('{이름}', '종외손자'),
  '*:B.D.D': t('{이름}', '종외손녀'),
  '*:Z.S.S': t('{이름}', '이질손자'),
  '*:Z.S.D': t('{이름}', '이질손녀'),
  '*:Z.D.S': t('{이름}', '이질외손자'),
  '*:Z.D.D': t('{이름}', '이질외손녀'),

  // 부모의 형제자매
  '*:F.eB': t('큰아버지, 큰아빠', '큰아버지'),
  '*:F.yB': (c) => (married(c.target) ? t('작은아버지, 작은아빠', '작은아버지') : t('삼촌', '작은아버지', '결혼하면 작은아버지라고 불러요')),
  '*:F.eB.W': t('큰어머니, 큰엄마', '큰어머니'),
  '*:F.yB.W': t('작은어머니, 숙모', '작은어머니'),
  '*:F.Z': t('고모'),
  '*:F.Z.H': t('고모부'),
  '*:M.B': t('외삼촌', '외삼촌', '외숙부라고도 해요'),
  '*:M.B.W': t('외숙모'),
  '*:M.Z': t('이모'),
  '*:M.Z.H': t('이모부'),

  // 조부모의 형제자매
  '*:F.F.eB': t('큰할아버지', '종조부'),
  '*:F.F.yB': t('작은할아버지', '종조부'),
  '*:F.F.eB.W': t('큰할머니', '종조모'),
  '*:F.F.yB.W': t('작은할머니', '종조모'),
  '*:F.F.Z': t('고모할머니', '대고모'),
  '*:F.F.Z.H': t('고모할아버지'),
  '*:F.M.B': t('외종조할아버지', '진외종조부', '아버지의 외삼촌이에요'),
  '*:F.M.Z': t('이모할머니', '진외이모할머니', '아버지의 이모예요'),
  '*:M.F.eB': t('큰외할아버지', '외종조부'),
  '*:M.F.yB': t('작은외할아버지', '외종조부'),
  '*:M.F.Z': t('고모할머니', '외대고모'),
  '*:M.M.B': t('외삼촌할아버지', '외외종조부', '어머니의 외삼촌이에요'),
  '*:M.M.Z': t('이모할머니', '외이모할머니'),
  '*:F.M.B.W': t('외종조할머니', '진외종조모'),
  '*:F.M.Z.H': t('이모할아버지', '진외이모할아버지'),
  '*:M.F.eB.W': t('큰외할머니', '외종조모'),
  '*:M.F.yB.W': t('작은외할머니', '외종조모'),
  '*:M.F.Z.H': t('고모할아버지', '외대고모부'),
  '*:M.M.B.W': t('외삼촌할머니', '외외종조모'),
  '*:M.M.Z.H': t('이모할아버지', '외이모할아버지'),

  // 아내 쪽 (처가)
  'm:W.F': t('장인어른, 아버님', '장인'),
  'm:W.M': t('장모님, 어머님', '장모'),
  'm:W.eB': t('형님', '처남', '아내의 오빠는 나이와 상관없이 형님이라고 불러요'),
  'm:W.yB': t('처남', '처남', '처남이 나보다 나이가 많으면 존댓말을 써요'),
  'm:W.eZ': t('처형'),
  'm:W.yZ': t('처제'),
  'm:W.eB.W': t('아주머니', '처남댁'),
  'm:W.yB.W': t('처남댁', '처남댁'),
  'm:W.eZ.H': t('형님', '동서', '아내 언니의 남편이에요'),
  'm:W.yZ.H': t('동서, {성}서방', '동서', '아내 동생의 남편이에요. 나이가 많으면 서로 존대해요'),
  'm:W.F.F': t('할아버님', '처조부'),
  'm:W.F.M': t('할머님', '처조모'),
  'm:W.M.F': t('외할아버님', '처외조부'),
  'm:W.M.M': t('외할머님', '처외조모'),
  'm:W.F.eB': t('큰아버님', '처백부'),
  'm:W.F.yB': t('작은아버님', '처숙부'),
  'm:W.F.eB.W': t('큰어머님', '처백모'),
  'm:W.F.yB.W': t('작은어머님', '처숙모'),
  'm:W.F.Z': t('고모님', '처고모'),
  'm:W.F.Z.H': t('고모부님', '처고모부'),
  'm:W.M.B': t('외숙부님', '처외숙'),
  'm:W.M.B.W': t('외숙모님', '처외숙모'),
  'm:W.M.Z': t('이모님', '처이모'),
  'm:W.M.Z.H': t('이모부님', '처이모부'),
  'm:W.B.S': t('{이름}', '처조카'),
  'm:W.B.D': t('{이름}', '처조카'),
  'm:W.Z.S': t('{이름}', '처조카'),
  'm:W.Z.D': t('{이름}', '처조카'),
  'm:W.B.S.W': t('아가, 질부', '처조카며느리'),
  'm:W.Z.S.W': t('아가, 질부', '처조카며느리'),
  'm:W.B.D.H': t('{성}서방', '처조카사위'),
  'm:W.Z.D.H': t('{성}서방', '처조카사위'),

  // 남편 쪽 (시댁)
  'f:H.F': t('아버님', '시아버지'),
  'f:H.M': t('어머님', '시어머니'),
  'f:H.eB': t('아주버님', '시아주버니'),
  'f:H.yB': (c) => (married(c.target) ? t('서방님', '시동생') : t('도련님', '시동생', '결혼하면 서방님이라고 불러요')),
  'f:H.eZ': t('형님', '시누이', '남편의 누나예요'),
  'f:H.yZ': t('아가씨', '시누이', '남편의 여동생이에요'),
  'f:H.eB.W': t('형님', '동서', '손위 동서예요'),
  'f:H.yB.W': t('동서', '동서', '손아래 동서예요'),
  'f:H.eZ.H': t('아주버님', '시누이 남편'),
  'f:H.yZ.H': t('서방님', '시누이 남편'),
  'f:H.F.F': t('할아버님', '시조부'),
  'f:H.F.M': t('할머님', '시조모'),
  'f:H.M.F': t('외할아버님', '시외조부'),
  'f:H.M.M': t('외할머님', '시외조모'),
  'f:H.F.eB': t('큰아버님', '시백부'),
  'f:H.F.yB': t('작은아버님', '시숙부'),
  'f:H.F.eB.W': t('큰어머님', '시백모'),
  'f:H.F.yB.W': t('작은어머님', '시숙모'),
  'f:H.F.Z': t('고모님', '시고모'),
  'f:H.F.Z.H': t('고모부님', '시고모부'),
  'f:H.M.B': t('외숙부님', '시외숙'),
  'f:H.M.B.W': t('외숙모님', '시외숙모'),
  'f:H.M.Z': t('이모님', '시이모'),
  'f:H.M.Z.H': t('이모부님', '시이모부'),
  'f:H.B.S': t('{이름}', '시조카'),
  'f:H.B.D': t('{이름}', '시조카'),
  'f:H.Z.S': t('{이름}', '시조카'),
  'f:H.Z.D': t('{이름}', '시조카'),
  'f:H.B.S.W': t('아가, 질부', '조카며느리'),
  'f:H.Z.S.W': t('아가, 질부', '조카며느리'),
  'f:H.B.D.H': t('{성}서방', '조카사위'),
  'f:H.Z.D.H': t('{성}서방', '조카사위'),

  // 자녀의 배우자 쪽 (사돈)
  '*:S.W': t('아가, 새아가', '며느리', '손주가 생기면 OO어미라고도 불러요'),
  '*:D.H': t('{성}서방, 자네', '사위'),
  '*:S.S.W': t('아가', '손자며느리'),
  '*:D.S.W': t('아가', '외손자며느리'),
  '*:S.D.H': t('{성}서방', '손녀사위'),
  '*:D.D.H': t('{성}서방', '외손녀사위'),
  '*:S.W.F': t('사돈어른', '사돈', '바깥사돈이에요'),
  '*:S.W.M': t('사부인', '사돈', '안사돈이에요'),
  '*:D.H.F': t('사돈어른', '사돈', '바깥사돈이에요'),
  '*:D.H.M': t('사부인', '사돈', '안사돈이에요'),
  '*:B.W.F': t('사장어른', '사돈어른', '형제의 배우자 부모님이에요'),
  '*:B.W.M': t('사부인', '사돈'),
  '*:Z.H.F': t('사장어른', '사돈어른', '자매의 배우자 부모님이에요'),
  '*:Z.H.M': t('사부인', '사돈'),
  '*:S.W.B': t('사돈', '사돈'),
  '*:S.W.Z': t('사돈', '사돈'),
  '*:D.H.B': t('사돈', '사돈'),
  '*:D.H.Z': t('사돈', '사돈'),
  '*:B.W.B': (c) => t(married(c.target) ? '사돈' : '사돈총각', '사돈'),
  '*:B.W.Z': (c) => t(married(c.target) ? '사돈' : '사돈처녀', '사돈'),
  '*:Z.H.B': (c) => t(married(c.target) ? '사돈' : '사돈총각', '사돈'),
  '*:Z.H.Z': (c) => t(married(c.target) ? '사돈' : '사돈처녀', '사돈'),
}

const COUSIN_KIND: Record<string, string> = { 'F.B': '사촌', 'F.Z': '고종사촌', 'M.B': '외사촌', 'M.Z': '이종사촌' }

const stripAge = (s: Step) => (s.length === 2 ? s[1] : s)

function lookup(g: 'm' | 'f', steps: string[], c: Ctx): Term | undefined {
  const exact = steps.join('.')
  const loose = steps.map((s) => (s.length === 2 ? s[1] : s)).join('.')
  for (const key of [`${g}:${exact}`, `*:${exact}`, `${g}:${loose}`, `*:${loose}`]) {
    const e = TABLE[key]
    if (e) return typeof e === 'function' ? e(c) : e
  }
}

/** 사촌(친·고종·외·이종)과 그 배우자·자녀. 배우자의 사촌도 여기서 처리한다. */
function cousinTerm(g: 'm' | 'f', steps: Step[], c: Ctx, offset: number): Term | undefined {
  const s = steps.slice(offset)
  if (s.length < 3) return
  const kind = COUSIN_KIND[`${s[0]}.${stripAge(s[1])}`]
  if (!kind || !'SD'.includes(s[2])) return
  const cousinIdx = offset + 3
  const cousin = c.people[cousinIdx]
  // 비교 기준: 배우자의 사촌이면 배우자, 아니면 나
  const base = offset === 0 ? 0 : 1
  const older = c.older(cousinIdx, base)
  const sibStep = (older === undefined ? null : `${older ? 'e' : 'y'}${cousin.gender === 'M' ? 'B' : 'Z'}`) as Step | null
  const rest = s.slice(3)

  if (offset === 1) {
    // 배우자의 사촌: 배우자 형제처럼 부르고 앞에 사촌을 붙인다
    if (rest.length) return
    const sp = steps[0]
    const prefix = sp === 'W' ? '처' : '시'
    if (!sibStep) {
      return t(g === 'm' ? (cousin.gender === 'M' ? '형님 또는 처남' : '처형 또는 처제') : cousin.gender === 'M' ? '아주버님 또는 도련님' : '형님 또는 아가씨', `${prefix}사촌`, '배우자보다 나이가 많은지에 따라 달라져요. 출생년도를 넣어주세요')
    }
    const base = lookup(g, [sp, sibStep], c)
    return base && t(base.call, `${prefix}사촌 (${kind})`, base.note)
  }

  if (rest.length === 0) {
    if (!sibStep) {
      const call = cousin.gender === 'M' ? (g === 'm' ? '형 또는 {이름}' : '오빠 또는 {이름}') : g === 'm' ? '누나 또는 {이름}' : '언니 또는 {이름}'
      return t(call, kind, '나보다 나이가 많은지에 따라 달라져요. 출생년도를 넣어주세요')
    }
    const base = lookup(g, [sibStep], c)!
    const ref = older ? `${kind} ${base.ref}` : `${kind} 동생`
    return t(base.call, ref)
  }
  if (rest.length === 1 && 'HW'.includes(rest[0])) {
    if (!sibStep) return t('사촌 형제의 나이에 따라 달라요', `${kind}의 배우자`)
    const base = lookup(g, [sibStep, rest[0]], c)
    return base && t(base.call, `${kind} ${base.ref}`, base.note)
  }
  if (rest.length === 1 && 'SD'.includes(rest[0])) return t('{이름}', '오촌 조카', '당질이라고도 해요')
}

/** 부모의 사촌: 아버지 쪽은 당숙·당고모, 어머니 쪽은 외당숙·외당이모 */
function parentCousinTerm(steps: Step[], c: Ctx): Term | undefined {
  if (steps.length !== 4 || !'FM'.includes(steps[0])) return
  const kind = COUSIN_KIND[`${steps[1]}.${stripAge(steps[2])}`]
  if (!kind || !'SD'.includes(steps[3])) return
  const male = c.target.gender === 'M'
  if (steps[0] === 'F') return male ? t('아저씨, 당숙', '당숙', `아버지의 ${kind}이에요`) : t('고모', '당고모', `아버지의 ${kind}이에요`)
  return male ? t('외삼촌, 외당숙', '외당숙', `어머니의 ${kind}이에요`) : t('이모', '외당이모', `어머니의 ${kind}이에요`)
}

/** 가족의 결혼으로 이어진 다른 집안 사람(사돈의 가족 등)은 두루 사돈이라 부른다 */
function inLawTerm(steps: Step[], people: Person[]): Term | undefined {
  const k = steps.findIndex((s, i) => i > 0 && (s === 'H' || s === 'W'))
  if (k < 0 || k === steps.length - 1) return
  const gen = steps.reduce((g, s) => g + (s === 'F' || s === 'M' ? -1 : s === 'S' || s === 'D' ? 1 : 0), 0)
  const note = `${describePath(steps, people)}예요. 딱 맞는 호칭이 없어 사돈이라고 두루 불러요`
  return gen < 0 ? t('사돈어른', '사돈', note) : t('사돈', '사돈', note)
}

const ORDINAL = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째']

/** 같은 자리에 여러 명이면 "둘째 큰아버지", "큰형" 처럼 순서를 붙인다 */
function withOrdinal(term: Term, c: Ctx, steps: Step[]): Term {
  let i = steps.length - 1
  if (i >= 1 && (steps[i] === 'H' || steps[i] === 'W')) i--
  const step = steps[i]
  if (!step || step.length !== 2) return term
  const anchor = c.people[i]
  const sib = c.people[i + 1]
  const same = siblingsOf(c.fam, anchor).filter((s) => {
    if (s.gender !== sib.gender) return false
    // 형수·매형처럼 배우자를 부르는 경우엔 결혼한 형제끼리만 순서를 센다
    if (i < steps.length - 1 && !s.spouseId) return false
    const o = isOlder(s, anchor)
    return step[0] === 'e' ? o === true : o === false
  })
  if (same.length < 2) return term
  const n = same.findIndex((s) => s.id === sib.id)
  if (steps.length === 1 && same.length === 2 && !term.call.includes('{이름}')) {
    const pre = n === 0 ? '큰' : '작은'
    return { ...term, ref: pre + term.ref, call: pre + term.call }
  }
  const ord = ORDINAL[n] ?? `${n + 1}번째`
  const note = steps.join('.') === 'F.eB' && n === 1 && same.length === 2 ? '흔히 작은 큰아빠라고도 불러요' : term.note
  return { ...term, ref: `${ord} ${term.ref}`, note }
}

const STEP_WORD: Record<string, string> = {
  F: '아버지', M: '어머니', S: '아들', D: '딸', H: '남편', W: '아내', yB: '남동생', yZ: '여동생',
}

/** 경로 한 걸음을 말로. 손위 형제는 앞사람 성별에 따라 형/오빠, 누나/언니 */
export function stepWord(s: Step, from: Gender) {
  if (s === 'eB') return from === 'M' ? '형' : '오빠'
  if (s === 'eZ') return from === 'M' ? '누나' : '언니'
  return STEP_WORD[s]
}

function describePath(steps: Step[], people: Person[]) {
  return steps.map((s, i) => stepWord(s, people[i].gender)).join('의 ')
}

function fill(text: string, p: Person) {
  const name = p.name.trim()
  const given = name.length >= 3 ? name.slice(1) : name || '이름'
  return text.replaceAll('{이름}', given).replaceAll('{성}', name ? name[0] : 'O')
}

export function relate(fam: Family, viewerId: string, targetId: string): Relation | null {
  const viewer = fam.people[viewerId]
  const target = fam.people[targetId]
  if (!viewer || !target) return null
  if (viewerId === targetId) return { call: '나', ref: '나', path: [], via: [viewerId], chon: 0, known: true }
  const found = findPath(fam, viewerId, targetId)
  if (!found) return { call: '관계 없음', ref: '이어지지 않음', path: [], via: [], chon: null, known: false }

  const people = found.via.map((id) => fam.people[id])
  const ctx: Ctx = { fam, viewer, target, people, older: (i, j) => isOlder(people[i], people[j]) }
  const g = viewer.gender === 'M' ? 'm' : 'f'
  const steps = found.steps

  let term = lookup(g, steps, ctx) ?? cousinTerm(g, steps, ctx, 0) ?? parentCousinTerm(steps, ctx)
  if (!term && (steps[0] === 'H' || steps[0] === 'W')) term = cousinTerm(g, steps, ctx, 1)
  term ??= inLawTerm(steps, people)
  const known = !!term
  if (term) term = withOrdinal(term, ctx, steps)
  else {
    const words = describePath(steps, people)
    term = t(words, words, '사전에 없는 먼 관계라 관계를 풀어서 보여줘요')
  }

  return {
    call: fill(term.call, target),
    ref: term.ref,
    note: term.note && fill(term.note, target),
    path: steps,
    via: found.via,
    chon: chonOf(steps),
    known,
  }
}
