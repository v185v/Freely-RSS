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

export const READER_SHORTCUTS = [
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
    description: "Toggle high contrast mode",
    key: "Alt+Shift+H",
    target: "theme",
  },
] as const

export type ReaderShortcutTarget = (typeof READER_SHORTCUTS)[number]["target"]

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}
