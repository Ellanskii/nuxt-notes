import type { StorageLike } from '~/lib/storage'
import type { Note } from '~/types/note'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDraft,
  createMemoryStorage,
  draftKey,
  migrateNotes,
  NOTES_KEY,
  parseNote,
  readDraft,
  readNotes,
  resolveStorage,
  SCHEMA_VERSION,
  writeDraft,
  writeNotes,
} from '~/lib/storage'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Покупки',
    todos: [{ id: 't1', text: 'Хлеб', done: false }],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

let storage: StorageLike

beforeEach(() => {
  storage = createMemoryStorage()
})

describe('readNotes', () => {
  it('возвращает пустой список, когда ключа ещё нет', () => {
    expect(readNotes(storage)).toEqual({ data: [], failure: null })
  })

  it('читает то, что записали', () => {
    const notes = [makeNote()]
    writeNotes(storage, notes)
    expect(readNotes(storage)).toEqual({ data: notes, failure: null })
  })

  it('пишет конверт с номером схемы', () => {
    writeNotes(storage, [makeNote()])
    const envelope = JSON.parse(storage.getItem(NOTES_KEY)!)
    expect(envelope.version).toBe(SCHEMA_VERSION)
    expect(Array.isArray(envelope.data)).toBe(true)
  })

  it('сообщает о битом JSON, а не падает', () => {
    storage.setItem(NOTES_KEY, '{не json')
    expect(readNotes(storage)).toEqual({ data: null, failure: 'corrupt' })
  })

  it('сообщает о конверте без версии', () => {
    storage.setItem(NOTES_KEY, JSON.stringify({ data: [] }))
    expect(readNotes(storage).failure).toBe('corrupt')
  })

  it('не читает данные более новой схемы', () => {
    storage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, data: [] }))
    expect(readNotes(storage)).toEqual({ data: null, failure: 'unsupported-version' })
  })

  it('пропускает заметки некорректной формы, сохраняя остальные', () => {
    storage.setItem(NOTES_KEY, JSON.stringify({
      version: SCHEMA_VERSION,
      data: [makeNote(), { id: 42 }, null, makeNote({ id: 'note-2' })],
    }))

    const result = readNotes(storage)
    expect(result.failure).toBeNull()
    expect(result.data?.map(note => note.id)).toEqual(['note-1', 'note-2'])
  })
})

describe('migrateNotes', () => {
  it('разворачивает строковые пункты схемы v0 в объекты', () => {
    const legacy = [{ id: 'note-1', title: 'Дела', todos: ['Хлеб', 'Молоко'], createdAt: 500 }]
    const migrated = migrateNotes(0, legacy)

    expect(migrated).toHaveLength(1)
    expect(migrated![0]!.todos).toHaveLength(2)
    expect(migrated![0]!.todos[0]).toMatchObject({ text: 'Хлеб', done: false })
    expect(migrated![0]!.todos[0]!.id).toBeTruthy()
    expect(migrated![0]!.updatedAt).toBe(500)
  })

  it('проходит через полный цикл чтения для данных v0', () => {
    storage.setItem(NOTES_KEY, JSON.stringify({
      version: 0,
      data: [{ id: 'note-1', title: 'Дела', todos: ['Хлеб'], createdAt: 500 }],
    }))

    const result = readNotes(storage)
    expect(result.failure).toBeNull()
    expect(result.data![0]!.todos[0]!.text).toBe('Хлеб')
  })

  it('отклоняет неизвестную версию и не-массив', () => {
    expect(migrateNotes(99, [])).toBeNull()
    expect(migrateNotes(SCHEMA_VERSION, { nope: true })).toBeNull()
  })
})

describe('writeNotes', () => {
  it('распознаёт переполнение хранилища', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const error = new Error('full')
        error.name = 'QuotaExceededError'
        throw error
      },
      removeItem: () => {},
    }

    expect(writeNotes(failing, [makeNote()])).toEqual({ ok: false, failure: 'quota' })
  })

  it('отличает переполнение от прочих отказов записи', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    }

    expect(writeNotes(failing, [makeNote()])).toEqual({ ok: false, failure: 'unavailable' })
  })
})

describe('resolveStorage', () => {
  it('подставляет память, когда localStorage недоступен', () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {},
    }

    const resolved = resolveStorage(blocked)
    expect(resolved).not.toBe(blocked)

    resolved.setItem('k', 'v')
    expect(resolved.getItem('k')).toBe('v')
  })

  it('подставляет память, когда хранилища нет вовсе', () => {
    const resolved = resolveStorage(null)
    resolved.setItem('k', 'v')
    expect(resolved.getItem('k')).toBe('v')
  })

  it('возвращает рабочее хранилище как есть', () => {
    expect(resolveStorage(storage)).toBe(storage)
  })
})

describe('черновики', () => {
  it('хранятся отдельным ключом на заметку', () => {
    const first = { noteId: 'note-1', isNew: false, note: makeNote(), updatedAt: 10 }
    const second = { noteId: 'note-2', isNew: true, note: makeNote({ id: 'note-2' }), updatedAt: 20 }

    writeDraft(storage, first)
    writeDraft(storage, second)

    expect(readDraft(storage, 'note-1').data).toEqual(first)
    expect(readDraft(storage, 'note-2').data).toEqual(second)
    expect(draftKey('note-1')).not.toBe(draftKey('note-2'))
  })

  it('чистятся по одному', () => {
    writeDraft(storage, { noteId: 'note-1', isNew: false, note: makeNote(), updatedAt: 10 })
    clearDraft(storage, 'note-1')
    expect(readDraft(storage, 'note-1').data).toBeNull()
  })

  it('сообщают о битых данных', () => {
    storage.setItem(draftKey('note-1'), 'сломано')
    expect(readDraft(storage, 'note-1')).toEqual({ data: null, failure: 'corrupt' })
  })

  it('не читаются из другой версии схемы', () => {
    storage.setItem(draftKey('note-1'), JSON.stringify({ version: SCHEMA_VERSION + 1, noteId: 'note-1', note: makeNote() }))
    expect(readDraft(storage, 'note-1').failure).toBe('unsupported-version')
  })
})

describe('parseNote', () => {
  it('подставляет недостающие метки времени', () => {
    const parsed = parseNote({ id: 'x', title: 'y', todos: [] })
    expect(parsed?.createdAt).toBeTypeOf('number')
    expect(parsed?.updatedAt).toBe(parsed?.createdAt)
  })

  it('отклоняет объекты без обязательных полей', () => {
    expect(parseNote({ id: 'x', title: 'y' })).toBeNull()
    expect(parseNote({ title: 'y', todos: [] })).toBeNull()
    expect(parseNote('строка')).toBeNull()
  })
})

describe('устойчивость к падающему getItem', () => {
  it('трактует ошибку чтения как отсутствие данных', () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    expect(readNotes(failing)).toEqual({ data: [], failure: null })
  })
})
