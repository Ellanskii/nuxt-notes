import type { StorageLike } from '~/lib/storage'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryStorage, NOTES_KEY, readNotes, SCHEMA_VERSION, writeNotes } from '~/lib/storage'
import { FLUSH_DELAY_MS, useNotesStore } from '~/stores/notes'

function countingStorage(inner: StorageLike) {
  const writes: string[] = []
  return {
    writes,
    storage: {
      getItem: (key: string) => inner.getItem(key),
      setItem: (key: string, value: string) => {
        // Пробная запись resolveStorage в счёт не идёт.
        if (key === NOTES_KEY) {
          writes.push(key)
        }
        inner.setItem(key, value)
      },
      removeItem: (key: string) => inner.removeItem(key),
    } satisfies StorageLike,
  }
}

let storage: StorageLike

beforeEach(() => {
  setActivePinia(createPinia())
  storage = createMemoryStorage()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('гидратация', () => {
  it('поднимает заметки из хранилища', () => {
    writeNotes(storage, [{ id: 'a', title: 'Дела', todos: [], createdAt: 1, updatedAt: 1 }])

    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    expect(store.hydrated).toBe(true)
    expect(store.notes).toHaveLength(1)
    expect(store.readFailure).toBeNull()
  })

  it('на битых данных поднимается пустым и помечает отказ', () => {
    storage.setItem(NOTES_KEY, 'сломано')

    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    expect(store.notes).toEqual([])
    expect(store.readFailure).toBe('corrupt')
    expect(store.hydrated).toBe(true)
  })

  it('на данных более новой схемы переходит в режим только для чтения', () => {
    storage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, data: [] }))

    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    expect(store.isReadOnly).toBe(true)

    store.createNote({ title: 'Новая', todos: [] })
    store.flush()

    // Чужие данные остались нетронутыми.
    expect(JSON.parse(storage.getItem(NOTES_KEY)!).version).toBe(SCHEMA_VERSION + 1)
  })
})

describe('CRUD', () => {
  it('создаёт, обновляет и удаляет заметку', () => {
    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    const note = store.createNote({ title: 'Покупки', todos: [{ id: 't1', text: 'Хлеб', done: false }] })
    expect(store.byId(note.id)?.title).toBe('Покупки')

    store.updateNote(note.id, { title: 'Список покупок', todos: [] })
    expect(store.byId(note.id)?.title).toBe('Список покупок')
    expect(store.byId(note.id)?.todos).toEqual([])

    store.deleteNote(note.id)
    expect(store.byId(note.id)).toBeUndefined()
  })

  it('возвращает null при обновлении несуществующей заметки', () => {
    const store = useNotesStore()
    store.setStorage(storage)
    expect(store.updateNote('нет такой', { title: '', todos: [] })).toBeNull()
  })

  it('копирует пункты, а не хранит ссылку на переданный массив', () => {
    const store = useNotesStore()
    store.setStorage(storage)

    const todos = [{ id: 't1', text: 'Хлеб', done: false }]
    const note = store.createNote({ title: 'Покупки', todos })
    todos[0]!.text = 'изменено снаружи'

    expect(store.byId(note.id)?.todos[0]?.text).toBe('Хлеб')
  })

  it('отдаёт список отсортированным по времени изменения', () => {
    const store = useNotesStore()
    store.setStorage(storage)

    const first = store.createNote({ title: 'Первая', todos: [] })
    vi.advanceTimersByTime(5)
    const second = store.createNote({ title: 'Вторая', todos: [] })

    expect(store.sortedNotes.map(n => n.id)).toEqual([second.id, first.id])
  })
})

describe('запись в хранилище', () => {
  it('складывает пачку изменений в одну запись', () => {
    const counting = countingStorage(storage)
    const store = useNotesStore()
    store.setStorage(counting.storage)
    store.hydrate()

    for (let i = 0; i < 10; i += 1) {
      store.createNote({ title: `Заметка ${i}`, todos: [] })
    }

    expect(counting.writes).toHaveLength(0)

    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    expect(counting.writes).toHaveLength(1)
    expect(readNotes(storage).data).toHaveLength(10)
  })

  it('flush записывает немедленно и снимает отложенную запись', () => {
    const counting = countingStorage(storage)
    const store = useNotesStore()
    store.setStorage(counting.storage)

    store.createNote({ title: 'Срочная', todos: [] })
    store.flush()

    expect(counting.writes).toHaveLength(1)

    vi.advanceTimersByTime(FLUSH_DELAY_MS * 2)
    expect(counting.writes).toHaveLength(1)
  })

  it('без изменений ничего не пишет', () => {
    const counting = countingStorage(storage)
    const store = useNotesStore()
    store.setStorage(counting.storage)
    store.hydrate()

    store.flush()
    expect(counting.writes).toHaveLength(0)
  })

  it('сообщает о переполнении хранилища и не теряет заметку из памяти', () => {
    const store = useNotesStore()
    store.setStorage({
      getItem: () => null,
      setItem: (key: string) => {
        if (key === NOTES_KEY) {
          const error = new Error('full')
          error.name = 'QuotaExceededError'
          throw error
        }
      },
      removeItem: () => {},
    })

    const note = store.createNote({ title: 'Большая', todos: [] })
    store.flush()

    expect(store.writeFailure).toBe('quota')
    expect(store.byId(note.id)).toBeDefined()

    store.dismissWriteFailure()
    expect(store.writeFailure).toBeNull()
  })
})

describe('синхронизация вкладок', () => {
  it('подхватывает заметку, созданную в другой вкладке', () => {
    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    writeNotes(storage, [{ id: 'извне', title: 'Из другой вкладки', todos: [], createdAt: 1, updatedAt: 1 }])
    store.applyExternal()

    expect(store.byId('извне')).toBeDefined()
  })

  it('не затирает чужую заметку при флаше своих правок', () => {
    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    // Эта вкладка держит несохранённое изменение.
    const local = store.createNote({ title: 'Своя', todos: [] })

    // Вторая вкладка тем временем записала свою заметку.
    writeNotes(storage, [{ id: 'чужая', title: 'Соседняя вкладка', todos: [], createdAt: 1, updatedAt: 1 }])

    store.flush()

    const stored = readNotes(storage).data!
    expect(stored.map(n => n.id).sort()).toEqual([local.id, 'чужая'].sort())
  })

  it('убирает из списка заметку, удалённую в другой вкладке', () => {
    const store = useNotesStore()
    store.setStorage(storage)

    const note = store.createNote({ title: 'Общая', todos: [] })
    store.flush()

    writeNotes(storage, [])
    store.applyExternal()

    expect(store.byId(note.id)).toBeUndefined()
  })

  it('не роняет состояние, если другая вкладка записала мусор', () => {
    const store = useNotesStore()
    store.setStorage(storage)
    store.hydrate()

    const note = store.createNote({ title: 'Своя', todos: [] })
    storage.setItem(NOTES_KEY, 'мусор')
    store.applyExternal()

    expect(store.readFailure).toBe('corrupt')
    expect(store.byId(note.id)).toBeDefined()
  })
})
