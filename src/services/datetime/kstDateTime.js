const KST_TIME_ZONE = 'Asia/Seoul'

const kstPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
})

function toKstParts(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const parts = {}

  for (const { type, value: partValue } of kstPartsFormatter.formatToParts(date)) {
    parts[type] = partValue
  }

  return parts
}

/**
 * 타임존이 포함된 ISO 시각 문자열을 한국시간(Asia/Seoul) 기준 `YYYY-MM-DD`로 변환한다.
 * 파싱할 수 없는 값은 앞 10자리를 그대로 돌려준다.
 */
export function formatKstDate(value) {
  const parts = toKstParts(value)

  if (!parts) {
    return String(value ?? '').slice(0, 10)
  }

  return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * 타임존이 포함된 ISO 시각 문자열을 한국시간(Asia/Seoul) 기준 `HH:mm`(기본) 또는
 * `HH:mm:ss`(`includeSeconds`)로 변환한다.
 * 파싱할 수 없는 값은 `T` 뒤 시각 앞부분을 그대로 돌려준다.
 */
export function formatKstTime(value, { includeSeconds = false } = {}) {
  const parts = toKstParts(value)

  if (!parts) {
    return (
      String(value ?? '')
        .split('T')
        .at(-1)
        ?.slice(0, includeSeconds ? 8 : 5) ?? ''
    )
  }

  return includeSeconds
    ? `${parts.hour}:${parts.minute}:${parts.second}`
    : `${parts.hour}:${parts.minute}`
}

/**
 * 타임존이 포함된 ISO 시각 문자열을 한국시간(Asia/Seoul) 기준 `YYYY-MM-DD HH:mm`으로 변환한다.
 */
export function formatKstDateTime(value) {
  const parts = toKstParts(value)

  if (!parts) {
    return String(value ?? '')
      .replace('T', ' ')
      .slice(0, 16)
  }

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}
