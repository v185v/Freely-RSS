export const READER_SHORTCUT_HINT_ID = "reader-shell-shortcut-hint"

export const READER_LANDMARK_IDS = {
  navigation: "reader-shell-navigation",
  queue: "reader-shell-queue-pane",
  queueHeading: "reader-shell-queue-heading",
  reader: "reader-shell-reader-pane",
  readerHeading: "reader-shell-reader-heading",
  source: "reader-shell-source-pane",
  sourceHeading: "reader-shell-source-heading",
} as const

export const READER_LANDMARK_SHORTCUTS = [
  {
    description: "Focus primary navigation",
    key: "Alt+1",
    target: "navigation",
  },
  {
    description: "Focus source context",
    key: "Alt+2",
    target: "source",
  },
  {
    description: "Focus article queue",
    key: "Alt+3",
    target: "queue",
  },
  {
    description: "Focus reading panel",
    key: "Alt+4",
    target: "reader",
  },
  {
    description: "Toggle high contrast theme",
    key: "Alt+Shift+H",
    target: "theme",
  },
] as const

export const READER_READING_FLOW_SHORTCUTS = [
  {
    description: "Move to the previous visible article when the queue or reader is focused",
    key: "K / ArrowUp",
  },
  {
    description: "Move to the next visible article when the queue or reader is focused",
    key: "J / ArrowDown",
  },
  {
    description: "Open the current article into the reading panel when the queue is focused",
    key: "Enter",
  },
  {
    description: "Toggle read and unread state when the reading panel is focused",
    key: "M",
  },
  {
    description: "Toggle starred state when the reading panel is focused",
    key: "S",
  },
  {
    description: "Toggle read later state when the reading panel is focused",
    key: "F",
  },
  {
    description: "Focus the reading panel from the current keyboard workflow",
    key: "R",
  },
] as const

export const READER_SHORTCUTS = [
  ...READER_LANDMARK_SHORTCUTS,
  ...READER_READING_FLOW_SHORTCUTS,
] as const

export type ReaderShortcutTarget = (typeof READER_LANDMARK_SHORTCUTS)[number]["target"]

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}
