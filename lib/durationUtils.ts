export function parseDuration(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;

  const trimmed = durationStr.trim().toLowerCase();
  let totalMinutes = 0;

  const parts = trimmed.split(/\s+/);

  for (const part of parts) {
    const match = part.match(/^(\d+(?:\.\d+)?)(h|m|d)$/);
    if (!match) continue;

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h':
        totalMinutes += value * 60;
        break;
      case 'm':
        totalMinutes += value;
        break;
      case 'd':
        totalMinutes += value * 8 * 60;
        break;
    }
  }

  return Math.round(totalMinutes);
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
