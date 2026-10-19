import type { Family } from './kin/types'

export function fileName(now = new Date()) {
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `우리호칭-가계도-${d}.json`
}

export const familyJson = (fam: Family) => JSON.stringify(fam, null, 2)

/** 우리 호칭에서 내보낸 내용인지 확인하고 가족으로 되돌린다 */
export function parseFamily(text: string): Family {
  let data: Family
  try {
    data = JSON.parse(text.trim()) as Family
  } catch {
    throw new Error('우리 호칭에서 저장한 내용이 아니에요. 파일이나 복사한 내용을 다시 확인해 주세요.')
  }
  if (!data?.meId || !data.people?.[data.meId]) throw new Error('가족 정보가 비어 있어요. 우리 호칭에서 저장한 내용인지 확인해 주세요.')
  return data
}

/** 카카오톡·네이버 앱처럼 앱 안에서 열린 브라우저. 파일 내려받기가 막혀 있는 경우가 많다. */
export function inAppBrowser(ua = navigator.userAgent): string | null {
  const apps: [RegExp, string][] = [
    [/KAKAOTALK/i, '카카오톡'],
    [/NAVER\(inapp/i, '네이버 앱'],
    [/DaumApps/i, '다음 앱'],
    [/Instagram/i, '인스타그램'],
    [/FBAN|FBAV/i, '페이스북'],
    [/\bLine\//i, '라인'],
  ]
  return apps.find(([re]) => re.test(ua))?.[1] ?? null
}

export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * 휴대폰에선 공유 창(파일에 저장, 메신저로 보내기)을 띄우고,
 * 그게 안 되는 곳에선 파일로 내려받는다.
 */
export async function saveFamily(fam: Family): Promise<SaveResult> {
  const name = fileName()
  const file = new File([familyJson(fam)], name, { type: 'application/json' })
  const touch = matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '우리 호칭 가계도' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // 공유가 막혀 있으면 내려받기로 넘어간다
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  // Firefox는 문서에 붙은 링크만, Safari는 다운로드가 시작된 뒤에 URL을 해제해야 내려받는다
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
