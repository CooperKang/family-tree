import { useRef, useState } from 'react'
import { familyJson, parseFamily } from '../familyFile'
import type { Family } from '../kin/types'
import { Button } from './ui'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 클립보드 API가 막힌 앱 안 브라우저용
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.append(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** 앱 안 브라우저(카카오톡 등)에서 저장하려 할 때 */
export function InAppSave({ fam, app, onTrySave, onDone }: { fam: Family; app: string; onTrySave: () => void; onDone: (msg: string) => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-5 p-5 md:p-6">
      <header>
        <p className="text-sm text-muted">파일로 저장하기</p>
        <h2 className="text-xl font-bold">{app} 안에서는 파일 저장이 막혀 있을 수 있어요</h2>
      </header>
      <p className="text-[15px] leading-relaxed text-muted">
        먼저 아래 버튼으로 저장해 보세요. 아무 일도 일어나지 않으면 가계도 내용을 복사해서 옮길 수 있어요. 복사한 뒤 Safari나 Chrome에서 이 주소를 열고, 메뉴의 <b className="text-ink">불러오기</b>에 붙여넣으면 돼요.
      </p>
      <div className="grid gap-2">
        <Button tone="primary" onClick={onTrySave}>
          파일로 저장해 보기
        </Button>
        <Button
          onClick={async () => {
            const ok = await copyText(familyJson(fam))
            setCopied(ok)
            if (ok) onDone('가계도 내용을 복사했어요. 다른 브라우저의 불러오기에 붙여넣으세요.')
          }}
        >
          {copied ? '복사했어요' : '가계도 내용 복사하기'}
        </Button>
      </div>
    </div>
  )
}

/** 파일을 고르거나, 복사해 둔 내용을 붙여넣어 불러온다 */
export function ImportForm({ onLoad, onCancel }: { onLoad: (f: Family) => void; onCancel: () => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const load = (raw: string) => {
    try {
      onLoad(parseFamily(raw))
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <div className="space-y-5 p-5 md:p-6">
      <header>
        <p className="text-sm text-muted">불러오기</p>
        <h2 className="text-xl font-bold">저장해 둔 가계도 불러오기</h2>
        <p className="mt-1 text-sm text-muted">지금 보고 있는 가계도는 불러온 내용으로 바뀌어요.</p>
      </header>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) load(await f.text())
        }}
      />
      <Button tone="primary" className="w-full" onClick={() => file.current?.click()}>
        파일 선택하기
      </Button>
      <div>
        <label htmlFor="paste" className="mb-1.5 block text-sm font-semibold text-muted">
          또는 복사해 둔 내용 붙여넣기
        </label>
        <textarea
          id="paste"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          rows={4}
          placeholder='{"meId": …'
          className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 font-mono text-sm outline-none focus:border-cheong focus:ring-2 focus:ring-cheong/20"
        />
      </div>
      {error && <p className="text-sm font-semibold text-hong">{error}</p>}
      <div className="flex gap-2">
        <Button tone="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button className="flex-1" disabled={!text.trim()} onClick={() => load(text)}>
          붙여넣은 내용 불러오기
        </Button>
      </div>
    </div>
  )
}
