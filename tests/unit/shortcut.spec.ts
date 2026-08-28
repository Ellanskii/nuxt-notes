import type { UndoIntentInput } from '~/lib/shortcut'
import { describe, expect, it } from 'vitest'
import { resolveTargetKind, resolveUndoIntent } from '~/lib/shortcut'

function input(overrides: Partial<UndoIntentInput> = {}): UndoIntentInput {
  return {
    key: 'z',
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    keyCode: 90,
    targetKind: 'other',
    fieldIsDirty: false,
    modalOpen: false,
    ...overrides,
  }
}

describe('resolveUndoIntent', () => {
  it('отдаёт undo приложению, когда фокус вне текстового поля', () => {
    expect(resolveUndoIntent(input())).toBe('app-undo')
  })

  it('распознаёт redo в трёх привычных сочетаниях', () => {
    expect(resolveUndoIntent(input({ shiftKey: true }))).toBe('app-redo')
    expect(resolveUndoIntent(input({ key: 'y' }))).toBe('app-redo')
    expect(resolveUndoIntent(input({ key: 'Z', shiftKey: true, ctrlKey: false, metaKey: true }))).toBe('app-redo')
  })

  it('работает с Cmd на macOS', () => {
    expect(resolveUndoIntent(input({ ctrlKey: false, metaKey: true }))).toBe('app-undo')
  })

  it('оставляет undo браузеру, пока в поле есть незафиксированный ввод', () => {
    expect(resolveUndoIntent(input({ targetKind: 'text-field', fieldIsDirty: true }))).toBe('native')
    expect(resolveUndoIntent(input({ targetKind: 'contenteditable', fieldIsDirty: true }))).toBe('native')
  })

  it('забирает undo себе, если в поле ничего не набрано в этой фокус-сессии', () => {
    expect(resolveUndoIntent(input({ targetKind: 'text-field', fieldIsDirty: false }))).toBe('app-undo')
  })

  it('молчит под открытой модалкой', () => {
    expect(resolveUndoIntent(input({ modalOpen: true }))).toBe('ignore')
    expect(resolveUndoIntent(input({ modalOpen: true, targetKind: 'text-field', fieldIsDirty: true }))).toBe('ignore')
  })

  it('пропускает наборную сессию IME', () => {
    expect(resolveUndoIntent(input({ isComposing: true }))).toBe('ignore')
    expect(resolveUndoIntent(input({ keyCode: 229 }))).toBe('ignore')
  })

  it('не реагирует без модификатора и на посторонние клавиши', () => {
    expect(resolveUndoIntent(input({ ctrlKey: false }))).toBe('ignore')
    expect(resolveUndoIntent(input({ key: 'a' }))).toBe('ignore')
    expect(resolveUndoIntent(input({ key: 's' }))).toBe('ignore')
  })
})

describe('resolveTargetKind', () => {
  it('различает текстовые поля, чекбоксы и прочее', () => {
    const text = document.createElement('input')
    text.type = 'text'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const textarea = document.createElement('textarea')
    const button = document.createElement('button')

    expect(resolveTargetKind(text)).toBe('text-field')
    expect(resolveTargetKind(textarea)).toBe('text-field')
    expect(resolveTargetKind(checkbox)).toBe('other')
    expect(resolveTargetKind(button)).toBe('other')
    expect(resolveTargetKind(null)).toBe('other')
  })
})
