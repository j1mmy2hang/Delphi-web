import { useEffect } from 'react'

// On iOS, focusing an input scrolls the page and the visualViewport shrinks.
// We pin the page to (0,0) and reposition the input bar above the keyboard.
export const useViewportKeyboard = (
  active: boolean,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  inputBarRef: React.RefObject<HTMLDivElement | null>,
) => {
  useEffect(() => {
    if (!active) return

    const vv = window.visualViewport
    const resetPageScroll = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    const textarea = textareaRef.current
    const onFocus = () => {
      resetPageScroll()
      // iOS defers its scroll-to-input; keep resetting briefly while it animates.
      const start = performance.now()
      const tick = () => {
        resetPageScroll()
        if (performance.now() - start < 300) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    textarea?.addEventListener('focus', onFocus)

    const onViewportChange = () => {
      resetPageScroll()
      const bar = inputBarRef.current
      if (!bar) return
      const offsetBottom = vv ? window.innerHeight - vv.height - vv.offsetTop : 0
      bar.style.bottom = `${Math.max(0, offsetBottom)}px`
    }

    vv?.addEventListener('resize', onViewportChange)
    vv?.addEventListener('scroll', onViewportChange)
    return () => {
      textarea?.removeEventListener('focus', onFocus)
      vv?.removeEventListener('resize', onViewportChange)
      vv?.removeEventListener('scroll', onViewportChange)
    }
  }, [active, textareaRef, inputBarRef])
}
