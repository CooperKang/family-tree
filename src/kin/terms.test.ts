import { describe, expect, it } from 'vitest'
import { addRelative, removePerson } from './ops'
import { sampleFamily } from './sample'
import { relate } from './terms'

const { fam, ids } = sampleFamily()
const r = (from: string, to: string) => relate(fam, ids[from], ids[to])!

describe('나(남편)가 부르는 호칭', () => {
  it.each([
    ['wSis', '처제', '처제'],
    ['wBro', '처남', '형님'],
    ['wBroW', '처남댁', '아주머니'],
    ['wFather', '장인', '장인어른, 아버님'],
    ['wUncle', '처숙부', '작은아버님'],
    ['sisterH', '매형', '매형'],
    ['brother', '남동생', '지호'],
    ['niece', '조카딸', '서윤'],
    ['mUncle', '외삼촌', '외삼촌'],
    ['mAunt', '이모', '이모'],
    ['aunt', '고모', '고모'],
  ])('%s → %s (%s)', (to, ref, call) => {
    expect(r('me', to).ref).toBe(ref)
    expect(r('me', to).call).toBe(call)
  })

  it('큰아버지가 둘이면 순서를 붙인다', () => {
    expect(r('me', 'uncle1').ref).toBe('첫째 큰아버지')
    expect(r('me', 'uncle2').ref).toBe('둘째 큰아버지')
    expect(r('me', 'uncle2').note).toContain('작은 큰아빠')
    expect(r('me', 'uncle2w').ref).toBe('둘째 큰어머니')
  })

  it('결혼 안 한 작은아버지는 삼촌', () => {
    expect(r('me', 'uncle3').call).toBe('삼촌')
  })

  it('사촌은 종류와 나이로 부른다', () => {
    expect(r('me', 'cousin1').ref).toBe('사촌 형')
    expect(r('me', 'cousin1').call).toBe('형')
    expect(r('me', 'cousin2').ref).toBe('고종사촌 동생')
  })

  it('촌수', () => {
    expect(r('me', 'cousin1').chon).toBe(4)
    expect(r('me', 'uncle1').chon).toBe(3)
    expect(r('me', 'wife').chon).toBe(0)
  })
})

describe('아내가 부르는 호칭', () => {
  it.each([
    ['father', '시아버지', '아버님'],
    ['brother', '시동생', '도련님'],
    ['sister', '시누이', '형님'],
    ['uncle1', '첫째 시백부', '큰아버님'],
    ['uncle3', '시숙부', '작은아버님'],
    ['cousin1', '시사촌 (사촌)', '아주버님'],
  ])('%s → %s (%s)', (to, ref, call) => {
    expect(r('wife', to).ref).toBe(ref)
    expect(r('wife', to).call).toBe(call)
  })
})

describe('반대 방향', () => {
  it.each([
    ['wSis', 'me', '형부'],
    ['wBro', 'me', '매제'],
    ['wFather', 'me', '사위'],
    ['father', 'wife', '며느리'],
    ['uncle1', 'wife', '조카며느리'],
    ['uncle1w', 'wife', '조카며느리'],
    ['wUncleW', 'me', '조카사위'],
    ['wUncle', 'me', '조카사위'],
    ['father', 'wFather', '사돈'],
    ['brother', 'wSis', '사돈'],
  ])('%s가 %s를 → %s', (from, to, ref) => {
    expect(r(from, to).ref).toBe(ref)
  })
  it('사돈처녀', () => expect(r('brother', 'wSis').call).toBe('사돈처녀'))
})

describe('아기가 부르는 호칭', () => {
  const { fam: withBaby, id } = addRelative(fam, ids.me, 'child', { name: '김아기', gender: 'F', unborn: true })
  const b = (to: string) => relate(withBaby, id, ids[to])!
  it.each([
    ['me', '아빠, 아버지'],
    ['wife', '엄마, 어머니'],
    ['father', '할아버지'],
    ['wFather', '외할아버지'],
    ['brother', '삼촌'],
    ['sister', '고모'],
    ['wSis', '이모'],
    ['wBro', '외삼촌'],
    ['wBroW', '외숙모'],
    ['gf', '증조할아버지'],
    ['uncle1', '큰할아버지'],
    ['aunt', '고모할머니'],
    ['niece', '언니'],
  ])('%s → %s', (to, call) => expect(b(to).call).toBe(call))
  it('고종사촌', () => expect(b('niece').ref).toBe('고종사촌 언니'))
  it('아빠의 사촌', () => {
    expect(b('cousin1').ref).toBe('당숙')
    expect(b('cousin2').call).toBe('고모')
    expect(b('cousin2').note).toContain('고종사촌')
  })
  it('외할아버지 형제의 배우자', () => expect(b('wUncleW').call).toBe('작은외할머니'))
})

describe('삭제', () => {
  it('형제를 지우면 쓸모없어진 이름 없는 부모도 지운다', () => {
    const a = addRelative(fam, ids.wSis, 'spouse', { name: '박서준', gender: 'M' })
    const b = addRelative(a.fam, a.id, 'olderSibling', { name: '박형', gender: 'M' })
    const before = Object.keys(b.fam.people).length
    const after = removePerson(b.fam, b.id)
    expect(Object.keys(after.people).length).toBe(before - 3)
  })
})
