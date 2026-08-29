import type { EffectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useNoteEditor } from '~/composables/useNoteEditor'
import { useNotesStore } from '~/stores/notes'

let scope: EffectScope

function makeEditor(noteId: string) {
  return scope.run(() => useNoteEditor(noteId))!
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
  scope = effectScope()
})

afterEach(() => {
  scope.stop()
})

describe('редактор новой заметки', () => {
  it('включает undo сразу после ввода в заголовок', () => {
    const editor = makeEditor('new')

    expect(editor.canUndo.value).toBe(false)
    editor.setTitle('Покупки')
    expect(editor.canUndo.value).toBe(true)
  })

  it('откатывает непрерывный ввод одним шагом', () => {
    const editor = makeEditor('new')

    for (const value of ['П', 'По', 'Пок', 'Покупки']) {
      editor.setTitle(value)
    }

    expect(editor.undo()).toBe(true)
    expect(editor.draft.title).toBe('')
    expect(editor.canUndo.value).toBe(false)
    expect(editor.canRedo.value).toBe(true)
  })

  it('возвращает откат через redo', () => {
    const editor = makeEditor('new')

    editor.setTitle('Покупки')
    editor.undo()

    expect(editor.redo()).toBe(true)
    expect(editor.draft.title).toBe('Покупки')
  })

  it('откатывает добавление, отметку и удаление пункта по отдельности', () => {
    const editor = makeEditor('new')

    const todo = editor.addTodo()
    editor.setTodoText(todo.id, 'Хлеб')
    editor.toggleTodo(todo.id)

    expect(editor.draft.todos).toHaveLength(1)
    expect(editor.draft.todos[0]!.done).toBe(true)

    editor.undo()
    expect(editor.draft.todos[0]!.done).toBe(false)

    editor.undo()
    expect(editor.draft.todos[0]!.text).toBe('')

    editor.undo()
    expect(editor.draft.todos).toHaveLength(0)
    expect(editor.canUndo.value).toBe(false)
  })

  it('гасит redo новым изменением', () => {
    const editor = makeEditor('new')

    editor.addTodo()
    editor.undo()
    expect(editor.canRedo.value).toBe(true)

    editor.addTodo()
    expect(editor.canRedo.value).toBe(false)
  })

  it('считает изменения по содержимому, а не по длине истории', () => {
    const editor = makeEditor('new')

    editor.setTitle('Покупки')
    expect(editor.isDirty.value).toBe(true)

    editor.undo()
    expect(editor.isDirty.value).toBe(false)
  })
})

describe('редактор существующей заметки', () => {
  it('сохраняет правки в стор и сбрасывает историю', () => {
    const store = useNotesStore()
    store.setStorage(window.localStorage)
    const created = store.createNote({ title: 'Дела', todos: [] })

    const editor = makeEditor(created.id)
    editor.setTitle('Дела на неделю')
    const saved = editor.save()

    expect(saved?.title).toBe('Дела на неделю')
    expect(store.byId(created.id)?.title).toBe('Дела на неделю')
    expect(editor.canUndo.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
  })

  it('отбрасывает пустые пункты при сохранении', () => {
    const store = useNotesStore()
    store.setStorage(window.localStorage)
    const created = store.createNote({ title: 'Дела', todos: [] })

    const editor = makeEditor(created.id)
    const filled = editor.addTodo()
    editor.setTodoText(filled.id, 'Хлеб')
    editor.addTodo()

    expect(editor.hasEmptyTodos.value).toBe(true)
    editor.save()

    expect(store.byId(created.id)?.todos).toHaveLength(1)
  })

  it('помечает заметку как не найденную при неизвестном id', () => {
    const editor = makeEditor('нет-такой')
    expect(editor.missing.value).toBe(true)
  })

  it('предлагает черновик после незасохранённых правок', () => {
    const store = useNotesStore()
    store.setStorage(window.localStorage)
    const created = store.createNote({ title: 'Дела', todos: [] })

    const first = makeEditor(created.id)
    first.setTitle('Правки без сохранения')
    window.dispatchEvent(new Event('pagehide'))

    const second = makeEditor(created.id)
    const draft = second.pendingDraft()

    expect(draft?.note.title).toBe('Правки без сохранения')

    second.restoreDraft(draft!.note)
    expect(second.draft.title).toBe('Правки без сохранения')
    // История живёт в рамках сессии: восстановленный черновик — новая точка отсчёта.
    expect(second.canUndo.value).toBe(false)
  })
})
