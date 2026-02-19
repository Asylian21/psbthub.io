export type ShareExpiryDisplayMode = 'local' | 'utc'

function toUtcDisplayDate(source: Date): Date {
  return new Date(
    source.getUTCFullYear(),
    source.getUTCMonth(),
    source.getUTCDate(),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
  )
}

function fromUtcDisplayDate(source: Date): Date {
  return new Date(
    Date.UTC(
      source.getFullYear(),
      source.getMonth(),
      source.getDate(),
      source.getHours(),
      source.getMinutes(),
      source.getSeconds(),
    ),
  )
}

export function detectLocalDatePickerFormat(): string {
  const dateParts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(2026, 10, 22))
  const order = dateParts
    .filter((part) =>
      part.type === 'day' || part.type === 'month' || part.type === 'year',
    )
    .map((part) => part.type)
    .join('-')

  if (order === 'month-day-year') {
    return 'mm/dd/yy'
  }

  if (order === 'year-month-day') {
    return 'yy-mm-dd'
  }

  return 'dd.mm.yy'
}

export function toPickerDateForMode(
  source: Date,
  mode: ShareExpiryDisplayMode,
): Date {
  if (mode === 'utc') {
    return toUtcDisplayDate(source)
  }

  return new Date(source.getTime())
}

export function fromPickerDateForMode(
  source: Date,
  mode: ShareExpiryDisplayMode,
): Date {
  if (mode === 'utc') {
    return fromUtcDisplayDate(source)
  }

  return new Date(source.getTime())
}
