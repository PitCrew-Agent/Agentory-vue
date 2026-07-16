export function formatLineLabel(label, locale = 'ko') {
  const source = String(label ?? '').trim()

  if (locale !== 'en' || !source) {
    return source
  }

  const lineMatch = source.match(/^([a-z0-9]+)\s*(?:-\s*line|line|라인)$/i)

  if (lineMatch) {
    return `${lineMatch[1].toUpperCase()} Line`
  }

  return source.replace(/라인/g, ' Line').replace(/\s+/g, ' ').trim()
}
