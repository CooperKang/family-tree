import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Chart from './components/Chart'
import { ImportForm, InAppSave } from './components/DataSheet'
import { AddForm, EditForm } from './components/PersonForms'
import Register from './components/Register'
import RelationPanel from './components/RelationPanel'
import Setup from './components/Setup'
import TreeView from './components/TreeView'
import { Segmented, Sheet } from './components/ui'
import { DEVELOPER, HUB_URL } from './about'
import { inAppBrowser, saveFamily } from './familyFile'
import { childrenOf } from './kin/graph'
import type { AddKind } from './kin/ops'
import type { Family, Gender } from './kin/types'
import { displayName, PREVIEW_BABY_ID, useFamily, useSides, withPreviewBaby } from './store'

type Tab = 'tree' | 'chart' | 'people'
type Panel = { t: 'rel' } | { t: 'add'; anchor: string; kind?: AddKind } | { t: 'edit'; id: string } | { t: 'inapp'; app: string } | { t: 'import' } | null

function Menu({ onSave, onImport, onReplace }: { onSave: () => void; onImport: () => void; onReplace: (f: Family | null) => void }) {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btn = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    setConfirmReset(false)
  }
  const run = (fn: () => void) => () => {
    close()
    fn()
  }
  // 패널은 body에 그려서 페이지의 어떤 층(z-index)에도 가리지 않게 하고, 위치는 버튼에 맞춘다
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = btn.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    place()
    window.addEventListener('resize', place)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  const item = 'block w-full rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold hover:bg-paper'
  return (
    <>
      <button ref={btn} type="button" aria-label="메뉴" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))} className="grid h-10 w-10 place-items-center rounded-xl text-xl hover:bg-card">
        ⋯
      </button>
      {createPortal(
        <>
          {/* 바깥을 누르면 닫힌다. 닫히는 애니메이션 동안 다음 터치를 막지 않도록 바로 없앤다 */}
          {open && <div className="fixed inset-0 z-[60]" onClick={close} />}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4, pointerEvents: 'none' }}
                transition={{ duration: 0.15 }}
                style={{ top: pos.top, right: pos.right }}
                className="fixed z-[61] w-56 origin-top-right rounded-2xl bg-card p-1.5 shadow-[0_20px_40px_-15px_rgb(31_36_51/0.35)]"
              >
                <button className={item} onClick={run(onSave)}>
                  파일로 저장하기
                </button>
                <button className={item} onClick={run(onImport)}>
                  불러오기
                </button>
                <a className={item} href={HUB_URL}>
                  다른 서비스 보기
                </a>
                <a className={item} href={DEVELOPER.repo} target="_blank" rel="noreferrer">
                  소스 코드 (GitHub)
                </a>
                <p className="px-3 pt-1 pb-2 text-xs text-muted">
                  만든 사람{' '}
                  <a className="font-semibold underline-offset-2 hover:underline" href={DEVELOPER.github} target="_blank" rel="noreferrer">
                    {DEVELOPER.name}
                  </a>
                </p>
                <div className="mx-2 my-1 border-t border-line/60" />
                {confirmReset ? (
                  <button className={`${item} text-hong`} onClick={() => onReplace(null)}>
                    정말 모두 지울까요? 한 번 더 누르세요
                  </button>
                ) : (
                  <button className={`${item} text-hong`} onClick={() => setConfirmReset(true)}>
                    처음부터 다시 만들기
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  )
}

export default function App() {
  const [stored, setStored] = useFamily()
  const [tab, setTab] = useState<Tab>('tree')
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [babyGender, setBabyGender] = useState<Gender | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(t)
  }, [notice])

  const realKids = stored ? childrenOf(stored, stored.people[stored.meId]) : []
  const previewing = !!stored && !!babyGender && realKids.length === 0
  const fam = useMemo(() => (stored && previewing ? withPreviewBaby(stored, babyGender!) : stored), [stored, previewing, babyGender])
  const sides = useSides(fam ?? { meId: '', people: {} })

  if (!fam || !stored) {
    return (
      <Setup
        onDone={(f) => {
          setStored(f)
          setViewerId(f.meId)
        }}
      />
    )
  }

  const me = fam.people[fam.meId]
  const spouse = me.spouseId ? fam.people[me.spouseId] : undefined
  const viewer = viewerId && fam.people[viewerId] ? viewerId : fam.meId
  const target = targetId && fam.people[targetId] ? targetId : null

  const closePanel = () => {
    setPanel(null)
    setTargetId(null)
  }
  const tap = (id: string) => {
    setTargetId(id)
    setPanel({ t: 'rel' })
  }
  const viewAs = (id: string) => {
    setViewerId(id)
    setTargetId(null)
    setPanel(null)
  }
  const commit = (f: Family | null) => {
    if (f) setStored(f)
    setPanel(target ? { t: 'rel' } : null)
  }
  const toggleBaby = () => {
    if (previewing) {
      setBabyGender(null)
      if (viewer === PREVIEW_BABY_ID) setViewerId(fam.meId)
    } else {
      setBabyGender('F')
      setViewerId(PREVIEW_BABY_ID)
    }
    setTargetId(null)
    setPanel(null)
  }

  const save = async () => {
    const r = await saveFamily(stored)
    if (r === 'shared') setNotice('가계도 파일을 저장했어요.')
    if (r === 'downloaded') setNotice('가계도 파일을 내려받았어요. 다운로드 폴더(아이폰은 파일 앱)에서 확인하세요.')
  }
  const startSave = () => {
    const app = inAppBrowser()
    if (app) {
      setTargetId(null)
      setPanel({ t: 'inapp', app })
    } else void save()
  }

  const quickViewers = [me, ...(spouse ? [spouse] : []), ...realKids]
  const otherViewer = !quickViewers.some((p) => p.id === viewer) && viewer !== PREVIEW_BABY_ID ? fam.people[viewer] : null

  return (
    <div className="flex h-full flex-col">
      {/* 메뉴가 아래 "누구 입장에서?" 줄 위로 펼쳐지므로 그 줄(z-20)보다 위에 둔다 */}
      <header className="relative z-30 flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 md:px-6">
        <h1 className="font-term hidden text-xl font-bold sm:block">우리 호칭</h1>
        <div className="sm:ml-auto md:ml-6">
          <Segmented
            name="tab"
            value={tab}
            onChange={(t) => {
              setTab(t)
              setPanel(null)
              setTargetId(null)
            }}
            options={[
              { value: 'tree', label: '가계도' },
              { value: 'chart', label: '호칭표' },
              { value: 'people', label: '가족 등록' },
            ]}
          />
        </div>
        <div className="ml-auto">
          <Menu
            onSave={startSave}
            onImport={() => {
              setTargetId(null)
              setPanel({ t: 'import' })
            }}
            onReplace={(f) => {
              setStored(f)
              setViewerId(null)
              closePanel()
            }}
          />
        </div>
      </header>

      {tab !== 'people' && (
        <nav aria-label="기준 사람" className="relative z-20 flex items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:px-6">
          <span className="shrink-0 text-sm text-muted">누구 입장에서?</span>
          {quickViewers.map((p) => (
            <ViewerChip key={p.id} active={viewer === p.id} onClick={() => viewAs(p.id)} label={p.id === fam.meId ? '나' : displayName(fam, p)} />
          ))}
          {realKids.length === 0 && (
            <ViewerChip active={viewer === PREVIEW_BABY_ID} onClick={toggleBaby} label={previewing ? '아기 시점 끄기' : '아기가 태어나면?'} tone="nori" />
          )}
          {previewing && (
            <div className="shrink-0">
              <Segmented
                name="baby-gender"
                value={babyGender!}
                onChange={setBabyGender}
                options={[
                  { value: 'F', label: '딸' },
                  { value: 'M', label: '아들' },
                ]}
              />
            </div>
          )}
          {otherViewer && <ViewerChip active onClick={() => tap(otherViewer.id)} label={displayName(fam, otherViewer)} />}
        </nav>
      )}

      <main className="relative flex-1 overflow-hidden">
        {tab === 'tree' && (
          <>
            <TreeView fam={fam} sides={sides} viewerId={viewer} targetId={target} onTap={tap} onBackground={closePanel} />
            <AnimatePresence>
              {!panel && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="pointer-events-none absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
                >
                  {viewer === PREVIEW_BABY_ID ? '아기가 부를 호칭이에요. 아무나 눌러보세요' : '사람을 누르면 어떻게 부르는지 보여요'}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
        {tab === 'chart' && (
          <Chart
            fam={fam}
            sides={sides}
            viewerId={viewer}
            onPick={(id) => {
              setTab('tree')
              tap(id)
            }}
          />
        )}
        {tab === 'people' && <Register fam={stored} sides={sides} onAdd={(anchor, kind) => setPanel({ t: 'add', anchor, kind })} onEdit={(id) => setPanel({ t: 'edit', id })} />}
      </main>

      <Sheet open={!!panel} onClose={closePanel} label="자세히">
        {panel?.t === 'rel' && target && (
          <RelationPanel
            fam={fam}
            sides={sides}
            viewerId={viewer}
            targetId={target}
            onViewAs={viewAs}
            onEdit={(id) => setPanel({ t: 'edit', id })}
            onAdd={(id) => setPanel({ t: 'add', anchor: id })}
            onSwap={() => {
              setViewerId(target)
              setTargetId(viewer)
            }}
          />
        )}
        {panel?.t === 'add' && stored.people[panel.anchor] && <AddForm key={panel.anchor + panel.kind} fam={stored} anchorId={panel.anchor} initialKind={panel.kind} onDone={commit} />}
        {panel?.t === 'edit' && stored.people[panel.id] && <EditForm key={panel.id} fam={stored} id={panel.id} onDone={commit} />}
        {panel?.t === 'inapp' && (
          <InAppSave
            fam={stored}
            app={panel.app}
            onTrySave={() => void save()}
            onDone={setNotice}
          />
        )}
        {panel?.t === 'import' && (
          <ImportForm
            onCancel={closePanel}
            onLoad={(f) => {
              setStored(f)
              setViewerId(null)
              closePanel()
              setNotice(`${displayName(f, f.people[f.meId])}님의 가계도를 불러왔어요.`)
            }}
          />
        )}
      </Sheet>

      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-x-4 top-[max(16px,env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-[15px] font-semibold text-white shadow-lg"
            onClick={() => setNotice(null)}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ViewerChip({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone?: 'nori' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      aria-pressed={active}
      onClick={onClick}
      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? (tone === 'nori' ? 'bg-nori text-white' : 'bg-ink text-white') : tone === 'nori' ? 'border border-dashed border-nori text-nori' : 'bg-card text-ink'
      }`}
    >
      {label}
    </motion.button>
  )
}
