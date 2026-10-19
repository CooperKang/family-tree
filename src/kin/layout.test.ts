import { describe, expect, it } from 'vitest'
import { layout, NODE_W } from './layout'
import { sampleFamily } from './sample'

describe('layout', () => {
  const { fam, ids } = sampleFamily()
  const l = layout(fam)
  const at = (k: string) => l.nodes.find((n) => n.id === ids[k])!

  it('모든 사람을 한 번씩 배치한다', () => {
    expect(new Set(l.nodes.map((n) => n.id)).size).toBe(Object.keys(fam.people).length)
  })
  it('같은 줄에서 겹치지 않는다', () => {
    const rows = Map.groupBy(l.nodes, (n) => n.y)
    for (const row of rows.values()) {
      const xs = row.map((n) => n.x).sort((a, b) => a - b)
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_W)
    }
  })
  it('내 쪽은 왼쪽, 아내 쪽은 오른쪽', () => {
    expect(at('father').x).toBeLessThan(at('wFather').x)
    expect(at('me').x).toBeLessThan(at('wife').x)
    expect(at('father').y).toBeLessThan(at('me').y)
  })
})
