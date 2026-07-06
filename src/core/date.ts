export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextLocalDateKey(date: Date): string {
  const tomorrow = new Date(date);
  tomorrow.setHours(24, 0, 0, 0);
  return localDateKey(tomorrow);
}

export function nextLocalMidnight(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

export function formatResetTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(nextLocalMidnight(date));
}
