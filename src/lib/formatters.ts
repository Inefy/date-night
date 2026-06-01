export function formatDuration(minutes: number): string {
  const normalizedMinutes = Number.isFinite(minutes)
    ? Math.max(0, Math.round(minutes))
    : 0;

  if (normalizedMinutes < 60) {
    return `${normalizedMinutes} min`;
  }

  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

export function formatOptionalDuration(minutes?: number): string | undefined {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }

  return formatDuration(minutes);
}
