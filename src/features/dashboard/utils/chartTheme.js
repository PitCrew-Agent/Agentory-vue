export function readChartToken(tokenName, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  return (
    window.getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim() || fallback
  )
}
