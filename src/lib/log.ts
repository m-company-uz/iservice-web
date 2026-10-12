/** One structured JSON line per event — Vercel's log viewer and `docker logs` both read it. */
export function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
