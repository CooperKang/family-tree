import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createFamily } from '../kin/ops'
import { sampleFamily } from '../kin/sample'
import type { Family, Gender } from '../kin/types'
import { DEVELOPER, HUB_URL } from '../about'
import { Button, Field, inputCls, Segmented } from './ui'

const QUESTIONS = [
  { q: '아내의 여동생은', a: '처제', tone: 'text-hong' },
  { q: '아버지의 형은', a: '큰아버지', tone: 'text-cheong' },
  { q: '남편의 남동생은', a: '도련님', tone: 'text-hong' },
  { q: '언니의 남편은', a: '형부', tone: 'text-cheong' },
  { q: '아기가 엄마의 오빠를', a: '외삼촌', tone: 'text-nori' },
]

function Rotating() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % QUESTIONS.length), 2600)
    return () => clearInterval(t)
  }, [])
  const cur = QUESTIONS[i]
  return (
    <div className="h-[132px] md:h-[150px]" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35 }}>
          <p className="text-lg text-muted md:text-xl">{cur.q}</p>
          <p className={`font-term text-[64px] leading-[1.15] font-bold md:text-[76px] ${cur.tone}`}>{cur.a}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function Setup({ onDone }: { onDone: (f: Family) => void }) {
  const [me, setMe] = useState({ name: '', gender: 'M' as Gender, birthYear: '' })
  const [sp, setSp] = useState({ name: '', birthYear: '' })
  const spGender: Gender = me.gender === 'M' ? 'F' : 'M'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!me.name.trim()) return
    onDone(
      createFamily(
        { name: me.name, gender: me.gender, birthYear: Number(me.birthYear) || undefined },
        sp.name.trim() ? { name: sp.name, gender: spGender, birthYear: Number(sp.birthYear) || undefined } : undefined,
      ),
    )
  }

  return (
    <div className="paper-grain min-h-full">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:items-center md:gap-16 md:py-20">
        <section>
          <h1 className="text-[15px] font-bold text-ink">우리 호칭</h1>
          <div className="mt-8">
            <Rotating />
          </div>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            양가 가족을 등록하면 한 장의 가계도로 이어 드려요. 누구를 누르든 그 사람 입장에서 모두를 뭐라고 부르는지 바로 보여요.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-6 rounded-[26px] bg-card p-6 shadow-[0_20px_50px_-30px_rgb(31_36_51/0.4)] md:p-8">
          <fieldset className="space-y-4">
            <legend className="mb-1 flex items-center gap-2 text-lg font-bold">
              <span className="h-3 w-3 rounded-full bg-cheong" /> 나
            </legend>
            <Field label="이름">
              <input className={inputCls} value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} placeholder="김지훈" required autoComplete="name" />
            </Field>
            <div className="flex items-end gap-3">
              <Field label="성별">
                <Segmented
                  name="my-gender"
                  value={me.gender}
                  onChange={(gender) => setMe({ ...me, gender })}
                  options={[
                    { value: 'M', label: '남자' },
                    { value: 'F', label: '여자' },
                  ]}
                />
              </Field>
              <div className="flex-1">
                <Field label="출생년도">
                  <input className={inputCls} inputMode="numeric" value={me.birthYear} onChange={(e) => setMe({ ...me, birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1992" />
                </Field>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 flex items-center gap-2 text-lg font-bold">
              <span className="h-3 w-3 rounded-full bg-hong" /> {me.gender === 'M' ? '아내' : '남편'}
            </legend>
            <div className="flex gap-3">
              <div className="flex-[3]">
                <Field label="이름">
                  <input className={inputCls} value={sp.name} onChange={(e) => setSp({ ...sp, name: e.target.value })} placeholder="이수아" />
                </Field>
              </div>
              <div className="flex-[2]">
                <Field label="출생년도">
                  <input className={inputCls} inputMode="numeric" value={sp.birthYear} onChange={(e) => setSp({ ...sp, birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1994" />
                </Field>
              </div>
            </div>
          </fieldset>

          <div className="space-y-2 pt-2">
            <Button type="submit" tone="primary" className="w-full py-3.5 text-base" disabled={!me.name.trim()}>
              가계도 만들기
            </Button>
            <Button tone="ghost" className="w-full" onClick={() => onDone(sampleFamily().fam)}>
              예시 가족으로 먼저 둘러보기
            </Button>
          </div>
        </form>
      </div>
      <footer className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-1 px-5 pb-8 text-sm text-muted">
        <span>
          만든 사람{' '}
          <a className="font-semibold text-ink underline-offset-2 hover:underline" href={DEVELOPER.github} target="_blank" rel="noreferrer">
            {DEVELOPER.name}
          </a>
        </span>
        <a className="underline-offset-2 hover:underline" href={DEVELOPER.repo} target="_blank" rel="noreferrer">
          소스 코드
        </a>
        <a className="underline-offset-2 hover:underline" href={HUB_URL}>
          다른 서비스
        </a>
        <span>MIT 라이선스</span>
      </footer>
    </div>
  )
}
