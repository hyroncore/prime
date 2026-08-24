import { useEffect, type RefObject } from 'react'

const FIELD_SELECTOR = 'input:not([type="hidden"]), textarea, button:not([disabled])'

export function useArrowFieldNavigation(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const container = ref.current
    if (!container || !enabled) return

    const getFields = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
        (el) =>
          el.offsetParent !== null &&
          !el.hasAttribute('disabled') &&
          el.getAttribute('aria-disabled') !== 'true'
      )

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const target = e.target as HTMLElement
      if (!container.contains(target)) return
      if (target.getAttribute('role') === 'combobox') return
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
        return
      }

      if (target instanceof HTMLTextAreaElement) {
        const caret = target.selectionStart ?? 0
        const totalLines = target.value.split('\n').length
        const currentLine = target.value.slice(0, caret).split('\n').length - 1
        if (e.key === 'ArrowUp' && currentLine > 0) return
        if (e.key === 'ArrowDown' && currentLine < totalLines - 1) return
      }

      const fields = getFields()
      const index = fields.indexOf(target)
      if (index === -1) return
      const next = e.key === 'ArrowDown' ? index + 1 : index - 1
      if (next < 0 || next >= fields.length) return
      e.preventDefault()
      fields[next].focus()
    }

    container.addEventListener('keydown', onKeyDown)
    return () => container.removeEventListener('keydown', onKeyDown)
  }, [ref, enabled])
}