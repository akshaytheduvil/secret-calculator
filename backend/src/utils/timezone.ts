// Asia/Kolkata (IST) Timezone Utilities

export function getISTDateString(d: Date = new Date()): string {
  // Returns YYYY-MM-DD in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

export function getISTTimeString(d: Date = new Date()): string {
  // Returns HH:mm:ss in Asia/Kolkata (24-hour)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(d);
}

export function getNextISTDateString(d: Date = new Date()): string {
  // Returns tomorrow's YYYY-MM-DD in Asia/Kolkata
  const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  return getISTDateString(tomorrow);
}

export function parseISTTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function isPastClosingTime(closingTimeStr: string): boolean {
  const currentIST = getISTTimeString();
  return currentIST >= closingTimeStr;
}
