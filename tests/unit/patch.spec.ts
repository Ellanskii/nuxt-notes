import type { NotePatch } from '~/lib/patch'
import type { Note } from '~/types/note'
import { describe, expect, it } from 'vitest'
import { applyPatch, invert, patchTargetId, textFieldKey } from '~/lib/patch'

function makeNote(): Note {
  return {
    id: 'note-1',
    title: 'Покупки',
    todos: [
      { id: 't1', text: 'Хлеб', done: false },
      { id: 't2', text: 'Молоко', done: true },
      { id: 't3', text: 'Кофе', done: false },
    ],
    createdAt: 1000,
    updatedAt: 1000,
  }
}

const patches: NotePatch[] = [
  { t: 'title', from: 'Покупки', to: 'Список покупок' },
  { t: 'todo-text', id: 't2', from: 'Молоко', to: 'Молоко 3.2%' },
  { t: 'todo-done', id: 't1', from: false, to: true },
  { t: 'todo-add', index: 1, item: { id: 't4', text: 'Сыр', done: false } },
  { t: 'todo-remove', index: 0, item: { id: 't1', text: 'Хлеб', done: false } },
]

describe('applyPatch', () => {
  it.each(patches)('откатывает изменение обратно в исходное состояние: $t', (patch) => {
    const note = makeNote()
    const before = structuredClone(note)

    applyPatch(note, patch, 'redo')
    expect(note).not.toEqual(before)

    applyPatch(note, patch, 'undo')
    expect(note).toEqual(before)
  })

  it('вставляет пункт на прежнее место при откате удаления', () => {
    const note = makeNote()
    const patch: NotePatch = { t: 'todo-remove', index: 1, item: { id: 't2', text: 'Молоко', done: true } }

    applyPatch(note, patch, 'redo')
    expect(note.todos.map(t => t.id)).toEqual(['t1', 't3'])

    applyPatch(note, patch, 'undo')
    expect(note.todos.map(t => t.id)).toEqual(['t1', 't2', 't3'])
  })

  it('не падает на патче для несуществующего пункта', () => {
    const note = makeNote()
    applyPatch(note, { t: 'todo-text', id: 'ghost', from: 'a', to: 'b' }, 'redo')
    expect(note.todos).toHaveLength(3)
  })

  it('срезает выходящий за границы индекс вставки', () => {
    const note = makeNote()
    applyPatch(note, { t: 'todo-add', index: 99, item: { id: 't9', text: 'Соль', done: false } }, 'redo')
    expect(note.todos.at(-1)?.id).toBe('t9')
  })

  it('кладёт копию пункта, а не ссылку на объект из записи истории', () => {
    const note = makeNote()
    const item = { id: 't5', text: 'Чай', done: false }

    applyPatch(note, { t: 'todo-add', index: 0, item }, 'redo')
    note.todos[0]!.text = 'изменено'

    expect(item.text).toBe('Чай')
  })
})

describe('invert', () => {
  it.each(patches)('является инволюцией: $t', (patch) => {
    expect(invert(invert(patch))).toEqual(patch)
  })
})

describe('patchTargetId', () => {
  it('возвращает id затронутого пункта', () => {
    expect(patchTargetId({ t: 'title', from: 'a', to: 'b' })).toBeNull()
    expect(patchTargetId({ t: 'todo-done', id: 't1', from: false, to: true })).toBe('t1')
    expect(patchTargetId({ t: 'todo-add', index: 0, item: { id: 't4', text: '', done: false } })).toBe('t4')
  })
})

describe('textFieldKey', () => {
  it('различает заголовок и пункты', () => {
    expect(textFieldKey({ kind: 'title' })).toBe('title')
    expect(textFieldKey({ kind: 'todo-text', id: 't1' })).toBe('todo-text:t1')
    expect(textFieldKey({ kind: 'todo-text', id: 't1' })).not.toBe(textFieldKey({ kind: 'todo-text', id: 't2' }))
  })
})
