export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  if (target.isContentEditable) {
    return true
  }

  return target.closest('[contenteditable=""], [contenteditable="true"]') !== null
}