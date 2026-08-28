import type { History } from '~/lib/history'
import type { NotePatch } from '~/lib/patch'
import type { Note, TodoItem } from '~/types/note'
import { describe, expect, it } from 'vitest'
import { createHistory } from '~/lib/history'
import { applyPatch } from '~/lib/patch'

function makeNote(): Note {
  return {
    id: 'note-1',
    title: '',
    todos: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

/** Мини-редактор: мутирует заметку и кладёт соответствующую запись в историю. */
function makeDriver(history: History, note: Note) {
  return {
    typeTitle(value: string, now: number) {
      const before = note.title
      note.title = value
      history.textInput({ kind: 'title' }, before, value, now)
    },
    typeTodo(id: string, value: string, now: number) {
      const todo = note.todos.find(item => item.id === id)!
      const before = todo.text
      todo.text = value
      history.textInput({ kind: 'todo-text', id }, before, value, now)
    },
    toggle(id: string) {
      const todo = note.todos.find(item => item.id === id)!
      const from = todo.done
      todo.done = !from
      history.push({ t: 'todo-done', id, from, to: !from })
    },
    add(index: number, item: TodoItem) {
      note.todos.splice(index, 0, { ...item })
      history.push({ t: 'todo-add', index, item: { ...item } })
    },
    remove(index: number) {
      const item = note.todos[index]!
      note.todos.splice(index, 1)
      history.push({ t: 'todo-remove', index, item: { ...item } })
    },
  }
}

function undoAll(history: History, note: Note): void {
  let patch: NotePatch | null
  while ((patch = history.undo()) !== null) {
    applyPatch(note, patch, 'undo')
  }
}

function redoAll(history: History, note: Note): void {
  let patch: NotePatch | null
  while ((patch = history.redo()) !== null) {
    applyPatch(note, patch, 'redo')
  }
}

describe('коалесинг текстового ввода', () => {
  it('сводит непрерывный ввод в одно поле к одной записи', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    const text = 'Покупки'
    for (let i = 1; i <= text.length; i += 1) {
      driver.typeTitle(text.slice(0, i), i * 10)
    }

    expect(history.undoDepth()).toBe(0)
    history.commitPending()
    expect(history.undoDepth()).toBe(1)

    undoAll(history, note)
    expect(note.title).toBe('')
  })

  it('закрывает запись при переключении на другое поле', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: '', done: false })
    expect(history.undoDepth()).toBe(1)

    driver.typeTitle('Дела', 10)
    driver.typeTodo('t1', 'Купить хлеб', 20)

    // Ввод в заголовок зафиксирован переключением, ввод в пункт ещё в pending.
    expect(history.undoDepth()).toBe(2)
    history.commitPending()
    expect(history.undoDepth()).toBe(3)
  })

  it('фиксирует запись по паузе ввода', () => {
    const history = createHistory({ coalesceMs: 600 })
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.typeTitle('Дел', 1000)
    expect(history.commitIfIdle(1400)).toBeNull()
    expect(history.undoDepth()).toBe(0)

    expect(history.commitIfIdle(1600)).not.toBeNull()
    expect(history.undoDepth()).toBe(1)
  })

  it('не создаёт запись, если текст вернулся к исходному', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.typeTitle('Дела', 10)
    driver.typeTitle('', 20)

    expect(history.commitPending()).toBeNull()
    expect(history.undoDepth()).toBe(0)
    expect(history.canUndo()).toBe(false)
  })

  it('фиксирует накопленный ввод перед атомарной операцией', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.typeTitle('Дела', 10)
    driver.add(0, { id: 't1', text: '', done: false })

    expect(history.undoDepth()).toBe(2)
  })

  it('держит to равным текущему значению поля — нативный undo не рассинхронизирует историю', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.typeTitle('Покупки', 10)
    // Браузер откатил ввод внутри поля, событие input принесло короткое значение.
    driver.typeTitle('Пок', 20)
    history.commitPending()

    undoAll(history, note)
    expect(note.title).toBe('')
  })
})

describe('атомарные записи', () => {
  it('отметка, добавление и удаление — отдельные шаги undo', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: 'Хлеб', done: false })
    driver.add(1, { id: 't2', text: 'Молоко', done: false })
    driver.toggle('t1')
    driver.remove(1)

    expect(history.undoDepth()).toBe(4)

    const patch = history.undo()!
    applyPatch(note, patch, 'undo')
    expect(note.todos.map(t => t.id)).toEqual(['t1', 't2'])

    applyPatch(note, history.undo()!, 'undo')
    expect(note.todos[0]!.done).toBe(false)
  })
})

describe('ветка redo', () => {
  it('очищается новым изменением после undo', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: 'Хлеб', done: false })
    driver.add(1, { id: 't2', text: 'Молоко', done: false })

    applyPatch(note, history.undo()!, 'undo')
    expect(history.redoDepth()).toBe(1)

    driver.add(1, { id: 't3', text: 'Кофе', done: false })
    expect(history.redoDepth()).toBe(0)
    expect(history.canRedo()).toBe(false)
  })

  it('гасится незафиксированным текстовым вводом', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.typeTitle('Дела', 10)
    history.commitPending()
    applyPatch(note, history.undo()!, 'undo')

    expect(history.canRedo()).toBe(true)
    driver.typeTitle('Другое', 20)
    expect(history.canRedo()).toBe(false)
  })
})

describe('лимит истории', () => {
  it('оставляет ровно 50 доступных шагов undo при 51 изменении', () => {
    const history = createHistory({ limit: 50 })
    const note = makeNote()
    const driver = makeDriver(history, note)

    for (let i = 0; i < 51; i += 1) {
      driver.add(i, { id: `t${i}`, text: `Пункт ${i}`, done: false })
    }

    expect(history.undoDepth()).toBe(50)

    let steps = 0
    while (history.undo() !== null) {
      steps += 1
    }
    expect(steps).toBe(50)
  })

  it('вытесняет самую старую запись, а не самую новую', () => {
    const history = createHistory({ limit: 2 })
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: 'первый', done: false })
    driver.add(1, { id: 't2', text: 'второй', done: false })
    driver.add(2, { id: 't3', text: 'третий', done: false })

    undoAll(history, note)
    // Первое добавление вытеснено, откатились только два последних.
    expect(note.todos.map(t => t.id)).toEqual(['t1'])
  })

  it('хранит патчи, а не копии заметки', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: 'Хлеб', done: false })
    driver.typeTitle('Покупки', 10)
    history.commitPending()

    const patches = [history.undo(), history.undo()]
    for (const patch of patches) {
      expect(patch).not.toBeNull()
      expect(patch).not.toHaveProperty('todos')
      expect(patch).not.toHaveProperty('createdAt')
      expect(patch).toHaveProperty('t')
    }
  })
})

describe('reset', () => {
  it('сбрасывает обе ветки и накопленный ввод', () => {
    const history = createHistory()
    const note = makeNote()
    const driver = makeDriver(history, note)

    driver.add(0, { id: 't1', text: 'Хлеб', done: false })
    history.undo()
    driver.typeTitle('Дела', 10)

    history.reset()

    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
    expect(history.pendingField()).toBeNull()
    expect(history.commitPending()).toBeNull()
  })
})

describe('фаззинг', () => {
  // Фиксированный сид: тест воспроизводим, но перебирает куда больше
  // сочетаний, чем точечные кейсы — ловит ошибки в invert и в индексах.
  function mulberry32(seed: number): () => number {
    let a = seed
    return () => {
      a |= 0
      a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('undo до упора возвращает исходное состояние, redo — финальное', () => {
    const random = mulberry32(20260828)
    const history = createHistory({ limit: 1000 })
    const note = makeNote()
    const driver = makeDriver(history, note)
    const initial = structuredClone(note)

    let nextId = 0
    for (let step = 0; step < 200; step += 1) {
      const roll = random()
      const count = note.todos.length

      if (roll < 0.25 || count === 0) {
        nextId += 1
        const index = count === 0 ? 0 : Math.floor(random() * (count + 1))
        driver.add(index, { id: `t${nextId}`, text: `Пункт ${nextId}`, done: false })
      }
      else if (roll < 0.45) {
        driver.remove(Math.floor(random() * count))
      }
      else if (roll < 0.65) {
        driver.toggle(note.todos[Math.floor(random() * count)]!.id)
      }
      else if (roll < 0.85) {
        const todo = note.todos[Math.floor(random() * count)]!
        driver.typeTodo(todo.id, `${todo.text}${step}`, step * 10)
      }
      else {
        driver.typeTitle(`${note.title}${step}`, step * 10)
      }
    }

    history.commitPending()
    const final = structuredClone(note)
    expect(final).not.toEqual(initial)

    undoAll(history, note)
    expect(note).toEqual(initial)

    redoAll(history, note)
    expect(note).toEqual(final)
  })
})
