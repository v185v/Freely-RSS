const QUEUE_VIEWPORT_FALLBACK_HEIGHT = 520

export const QUEUE_ARTICLE_ROW_ESTIMATE = 132
export const QUEUE_ARTICLE_OVERSCAN = 6

function resolveViewportRect(element: HTMLElement | null) {
  const rect = element?.getBoundingClientRect()
  const measuredHeight = rect && rect.height > 0 ? rect.height : (element?.clientHeight ?? 0)
  const measuredWidth = rect && rect.width > 0 ? rect.width : (element?.clientWidth ?? 0)

  return {
    height: measuredHeight > 0 ? measuredHeight : QUEUE_VIEWPORT_FALLBACK_HEIGHT,
    width: measuredWidth,
  }
}

export function observeQueueViewportRect(
  instance: { scrollElement?: Element | null },
  callback: (rect: { height: number; width: number }) => void,
) {
  const scrollElement = instance.scrollElement as HTMLElement | null

  if (!scrollElement) {
    return () => {}
  }

  const emit = () => {
    callback(resolveViewportRect(scrollElement))
  }

  emit()

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      emit()
    })

    observer.observe(scrollElement)

    return () => {
      observer.disconnect()
    }
  }

  window.addEventListener("resize", emit)

  return () => {
    window.removeEventListener("resize", emit)
  }
}
