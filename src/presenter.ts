export type PresenterAction =
  | 'next'
  | 'previous'
  | 'toggle-help'
  | 'toggle-mode'
  | 'reset'
  | 'replay'
  | 'none'

export function presenterActionForKey(
  key: string,
  target?: EventTarget | null,
): PresenterAction {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return key === 'Escape' ? 'toggle-help' : 'none'
  }

  switch (key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      return 'next'
    case 'ArrowLeft':
    case 'PageUp':
      return 'previous'
    case '?':
      return 'toggle-help'
    case 'e':
    case 'E':
      return 'toggle-mode'
    case 'r':
      return 'reset'
    case 'R':
      return 'replay'
    case 'Escape':
      return 'toggle-help'
    default:
      return 'none'
  }
}
