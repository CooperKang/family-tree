import { describe, expect, it } from 'vitest'
import { familyJson, fileName, inAppBrowser, parseFamily } from './familyFile'
import { sampleFamily } from './kin/sample'

describe('가계도 파일', () => {
  it('저장한 내용을 그대로 불러온다', () => {
    const { fam } = sampleFamily()
    expect(parseFamily(familyJson(fam))).toEqual(fam)
  })
  it('우리 호칭 내용이 아니면 이유를 알려준다', () => {
    expect(() => parseFamily('hello')).toThrow('저장한 내용이 아니에요')
    expect(() => parseFamily('{"a":1}')).toThrow('가족 정보가 비어 있어요')
  })
  it('파일 이름에 날짜를 붙인다', () => {
    expect(fileName(new Date(2026, 9, 19))).toBe('우리호칭-가계도-20261019.json')
  })
  it('앱 안 브라우저를 알아본다', () => {
    expect(inAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit KAKAOTALK 10.8.5')).toBe('카카오톡')
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 14) NAVER(inapp; search; 2000; 12.7.6)')).toBe('네이버 앱')
    expect(inAppBrowser('Mozilla/5.0 (iPhone) Version/18.0 Mobile/15E148 Safari/604.1')).toBeNull()
  })
})
