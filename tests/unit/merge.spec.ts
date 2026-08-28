import type { Note } from '~/types/note'
import { describe, expect, it } from 'vitest'
import { mergeNotes, sortByUpdatedAt } from '~/lib/merge'

function note(id: string, updatedAt = 0, title = id): Note {
  return { id, title, todos: [], createdAt: 0, updatedAt }
}

describe('mergeNotes', () => {
  it('не теряет заметку, созданную другой вкладкой', () => {
    const merged = mergeNotes({
      remote: [note('a'), note('b')],
      local: [note('a')],
      dirtyIds: new Set(),
      tombstones: new Set(),
    })

    expect(merged.map(n => n.id).sort()).toEqual(['a', 'b'])
  })

  it('накладывает локальные правки поверх чужого слепка', () => {
    const merged = mergeNotes({
      remote: [note('a', 1, 'из хранилища'), note('b')],
      local: [note('a', 2, 'правки этой вкладки')],
      dirtyIds: new Set(['a']),
      tombstones: new Set(),
    })

    expect(merged.find(n => n.id === 'a')?.title).toBe('правки этой вкладки')
    expect(merged.find(n => n.id === 'b')).toBeDefined()
  })

  it('берёт чужую версию для заметки, которую локально не трогали', () => {
    const merged = mergeNotes({
      remote: [note('a', 5, 'обновлено в другой вкладке')],
      local: [note('a', 1, 'устаревшее')],
      dirtyIds: new Set(),
      tombstones: new Set(),
    })

    expect(merged[0]?.title).toBe('обновлено в другой вкладке')
  })

  it('применяет локальное удаление к чужому слепку', () => {
    const merged = mergeNotes({
      remote: [note('a'), note('b')],
      local: [note('b')],
      dirtyIds: new Set(),
      tombstones: new Set(['a']),
    })

    expect(merged.map(n => n.id)).toEqual(['b'])
  })

  it('удаление побеждает локальную правку той же заметки', () => {
    const merged = mergeNotes({
      remote: [note('a')],
      local: [note('a', 9)],
      dirtyIds: new Set(['a']),
      tombstones: new Set(['a']),
    })

    expect(merged).toEqual([])
  })

  it('роняет локальную заметку, удалённую другой вкладкой, если её тут не правили', () => {
    const merged = mergeNotes({
      remote: [],
      local: [note('a')],
      dirtyIds: new Set(),
      tombstones: new Set(),
    })

    expect(merged).toEqual([])
  })

  it('сохраняет несохранённую локальную заметку, которой ещё нет в хранилище', () => {
    const merged = mergeNotes({
      remote: [],
      local: [note('new-1')],
      dirtyIds: new Set(['new-1']),
      tombstones: new Set(),
    })

    expect(merged.map(n => n.id)).toEqual(['new-1'])
  })
})

describe('sortByUpdatedAt', () => {
  it('ставит недавно изменённые первыми и не мутирует исходный массив', () => {
    const source = [note('a', 1), note('b', 3), note('c', 2)]
    const sorted = sortByUpdatedAt(source)

    expect(sorted.map(n => n.id)).toEqual(['b', 'c', 'a'])
    expect(source.map(n => n.id)).toEqual(['a', 'b', 'c'])
  })
})
