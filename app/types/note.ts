export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  todos: TodoItem[]
  createdAt: number
  updatedAt: number
}

export const TITLE_MAX_LENGTH = 200
export const TODO_TEXT_MAX_LENGTH = 500

/** Сколько пунктов показываем в превью на карточке списка. */
export const TODO_PREVIEW_LIMIT = 4
