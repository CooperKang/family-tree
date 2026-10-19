import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { parentsOf, siblingsOf } from '../kin/graph'
import { addRelative, moveOrder, removePerson, updatePerson, type AddKind } from '../kin/ops'
import { relate } from '../kin/terms'
import type { Family, Gender, Person } from '../kin/types'
import { displayName } from '../store'
import { Button, Field, inputCls, Segmented } from './ui'

const KINDS: { kind: AddKind; label: (g: Gender) => string }[] = [
  { kind: 'father', label: () => '아버지' },
  { kind: 'mother', label: () => '어머니' },
  { kind: 'olderSibling', label: (g) => (g === 'M' ? '형 · 누나' : '오빠 · 언니') },
  { kind: 'youngerSibling', label: () => '동생' },
  { kind: 'spouse', label: () => '배우자' },
  { kind: 'child', label: () => '자녀' },
]

function canAdd(fam: Family, p: Person, kind: AddKind) {
  if (kind === 'spouse') return !p.spouseId
  if (kind === 'father' || kind === 'mother') {
    const g = kind === 'father' ? 'M' : 'F'
    const ex = parentsOf(fam, p).find((x) => x.gender === g)
    return !ex || !!ex.placeholder
  }
  return true
}

const yearOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4)

export function AddForm({
  fam,
  anchorId,
  initialKind,
  onDone,
}: {
  fam: Family
  anchorId: string
  initialKind?: AddKind
  onDone: (fam: Family | null, newId?: string) => void
}) {
  const anchor = fam.people[anchorId]
  const [kind, setKind] = useState<AddKind>(initialKind ?? (KINDS.find((k) => canAdd(fam, anchor, k.kind))?.kind || 'child'))
  const [gender, setGender] = useState<Gender>(anchor.gender === 'M' ? 'F' : 'M')
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [unborn, setUnborn] = useState(false)
  const [error, setError] = useState('')

  const effGender: Gender = kind === 'father' ? 'M' : kind === 'mother' ? 'F' : gender
  const input = { name, gender: effGender, birthYear: Number(year) || undefined, unborn: kind === 'child' && unborn }

  // 입력하는 동안 "나에게는 뭐가 되는지" 미리 보여준다
  const preview = useMemo(() => {
    try {
      const r = addRelative(fam, anchorId, kind, { ...input, name: input.name || '' })
      return relate(r.fam, r.fam.meId, r.id)
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fam, anchorId, kind, effGender, year, unborn, name])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = addRelative(fam, anchorId, kind, input)
      onDone(r.fam, r.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const anchorName = displayName(fam, anchor)
  return (
    <form onSubmit={submit} className="space-y-5 p-5 md:p-6">
      <header>
        <p className="text-sm text-muted">가족 추가</p>
        <h2 className="text-xl font-bold">
          <span className="text-muted">{anchorName}</span>의 …
        </h2>
      </header>

      <div className="flex flex-wrap gap-2">
        {KINDS.map(({ kind: k, label }) => {
          const ok = canAdd(fam, anchor, k)
          return (
            <motion.button
              type="button"
              key={k}
              whileTap={{ scale: 0.94 }}
              disabled={!ok}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full border px-3.5 py-2 text-[15px] font-semibold transition-colors disabled:opacity-30 ${
                kind === k ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink hover:border-ink/40'
              }`}
            >
              {label(anchor.gender)}
            </motion.button>
          )
        })}
      </div>

      {kind !== 'father' && kind !== 'mother' && (
        <Field label="성별">
          <Segmented
            name="add-gender"
            value={gender}
            onChange={setGender}
            options={[
              { value: 'M', label: '남자' },
              { value: 'F', label: '여자' },
            ]}
          />
        </Field>
      )}

      <div className="flex gap-3">
        <div className="flex-[3]">
          <Field label="이름">
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'child' ? '태명도 좋아요' : '모르면 비워도 돼요'} />
          </Field>
        </div>
        <div className="flex-[2]">
          <Field label="출생년도">
            <input className={inputCls} inputMode="numeric" value={year} onChange={(e) => setYear(yearOnly(e.target.value))} placeholder="선택" />
          </Field>
        </div>
      </div>
      {kind === 'child' && (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="h-4 w-4 accent-nori" checked={unborn} onChange={(e) => setUnborn(e.target.checked)} />
          아직 태어나지 않았어요
        </label>
      )}

      <AnimatePresence mode="wait">
        {preview && (
          <motion.div
            key={preview.ref}
            initial={{ opacity: 0, rotateX: -70 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 70 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-paper px-4 py-3"
          >
            <p className="text-sm text-muted">나에게는</p>
            <p className="font-term text-2xl font-bold">{preview.ref}</p>
            {preview.call !== preview.ref && <p className="text-sm text-muted">부를 때는 “{preview.call}”</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm font-semibold text-hong">{error}</p>}
      <div className="flex gap-2">
        <Button tone="ghost" onClick={() => onDone(null)}>
          취소
        </Button>
        <Button type="submit" tone="primary" className="flex-1">
          추가하기
        </Button>
      </div>
    </form>
  )
}

export function EditForm({ fam, id, onDone }: { fam: Family; id: string; onDone: (fam: Family | null) => void }) {
  const p = fam.people[id]
  const [name, setName] = useState(p.name)
  const [gender, setGender] = useState<Gender>(p.gender)
  const [year, setYear] = useState(p.birthYear ? String(p.birthYear) : '')
  const [married, setMarried] = useState(!!p.married)
  const [unborn, setUnborn] = useState(!!p.unborn)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [current, setCurrent] = useState(fam)
  const sibs = siblingsOf(current, current.people[id])
  const isMe = id === fam.meId

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    onDone(updatePerson(current, id, { name: name.trim(), gender, birthYear: Number(year) || undefined, married: married || undefined, unborn: unborn || undefined }))
  }

  const ordered = [current.people[id], ...sibs].sort((a, b) => a.order - b.order)
  return (
    <form onSubmit={save} className="space-y-5 p-5 md:p-6">
      <header>
        <p className="text-sm text-muted">정보 고치기</p>
        <h2 className="text-xl font-bold">{displayName(fam, p)}</h2>
      </header>
      <div className="flex gap-3">
        <div className="flex-[3]">
          <Field label="이름">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="flex-[2]">
          <Field label="출생년도">
            <input className={inputCls} inputMode="numeric" value={year} onChange={(e) => setYear(yearOnly(e.target.value))} placeholder="선택" />
          </Field>
        </div>
      </div>
      <Field label="성별">
        <Segmented
          name="edit-gender"
          value={gender}
          onChange={setGender}
          options={[
            { value: 'M', label: '남자' },
            { value: 'F', label: '여자' },
          ]}
        />
      </Field>
      {!p.spouseId && (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="h-4 w-4 accent-cheong" checked={married} onChange={(e) => setMarried(e.target.checked)} />
          결혼했어요 (배우자는 등록 안 함)
        </label>
      )}
      {p.unborn !== undefined && (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="h-4 w-4 accent-nori" checked={unborn} onChange={(e) => setUnborn(e.target.checked)} />
          아직 태어나지 않았어요
        </label>
      )}

      {sibs.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">형제 순서 (위가 손위)</p>
          <p className="mb-2 text-xs text-muted">출생년도가 있으면 그걸 먼저 따라요</p>
          <ol className="space-y-1.5">
            {ordered.map((s, i) => (
              <motion.li layout key={s.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${s.id === id ? 'bg-ink text-white' : 'bg-paper'}`}>
                <span className="w-5 text-sm opacity-60">{i + 1}</span>
                <span className="flex-1 font-semibold">{displayName(current, s)}</span>
                {s.id === id && (
                  <>
                    <button type="button" aria-label="손위로" className="rounded-lg px-2 py-1 hover:bg-white/15" onClick={() => setCurrent(moveOrder(current, id, -1))}>
                      ▲
                    </button>
                    <button type="button" aria-label="손아래로" className="rounded-lg px-2 py-1 hover:bg-white/15" onClick={() => setCurrent(moveOrder(current, id, 1))}>
                      ▼
                    </button>
                  </>
                )}
              </motion.li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-2">
        <Button tone="ghost" onClick={() => onDone(null)}>
          취소
        </Button>
        <Button type="submit" tone="primary" className="flex-1">
          저장
        </Button>
      </div>
      {!isMe && (
        <div className="border-t border-line/60 pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm">{displayName(fam, p)}을(를) 가계도에서 지울까요?</span>
              <Button tone="ghost" onClick={() => setConfirmDelete(false)}>
                아니요
              </Button>
              <Button tone="danger" onClick={() => onDone(removePerson(current, id))}>
                지우기
              </Button>
            </div>
          ) : (
            <Button tone="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
              이 사람 지우기
            </Button>
          )}
        </div>
      )}
    </form>
  )
}
