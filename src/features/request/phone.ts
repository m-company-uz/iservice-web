/**
 * Uzbek phone mask (DEV note 6): shown as `+998 XX XXX-XX-XX`, sent as `+998XXXXXXXXX`.
 * Exactly 9 national digits; no operator-code allow-list (it ages badly).
 */

export const NATIONAL_LENGTH = 9;

/**
 * Extracts the national digits from whatever the visitor typed or pasted:
 * `+998 90 123-45-67`, `+998901234567`, `998901234567`, `901234567`, `0 90 123 45 67`.
 * A leading `+` means "country code follows", so live typing after the `+998 ` prefix works
 * even when the national number itself starts with 99/98.
 */
export function nationalDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (input.trimStart().startsWith('+')) {
    if (d.startsWith('998')) d = d.slice(3);
  } else if (d.length >= 12 && d.startsWith('998')) {
    d = d.slice(3);
  } else if (d.length === 10 && d.startsWith('0')) {
    d = d.slice(1);
  }
  return d.slice(0, NATIONAL_LENGTH);
}

/** Progressive display: "90" → "+998 90", "9012345" → "+998 90 123-45". Empty stays empty. */
export function formatNational(d: string): string {
  if (!d) return '';
  let out = `+998 ${d.slice(0, 2)}`;
  if (d.length > 2) out += ` ${d.slice(2, 5)}`;
  if (d.length > 5) out += `-${d.slice(5, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  return out;
}

export const formatPhoneInput = (input: string): string => formatNational(nationalDigits(input));

export function isCompletePhone(input: string): boolean {
  return nationalDigits(input).length === NATIONAL_LENGTH;
}

/** `+998XXXXXXXXX`, or null when incomplete. */
export function toE164(input: string): string | null {
  const d = nationalDigits(input);
  return d.length === NATIONAL_LENGTH ? `+998${d}` : null;
}

/** For logs only: "+998901234567" → "+998 90 *** ** 67" (§9.5). */
export function maskPhone(e164: string): string {
  const m = /^\+998(\d{2})\d{5}(\d{2})$/.exec(e164);
  return m ? `+998 ${m[1]} *** ** ${m[2]}` : '***';
}

/**
 * Where the caret belongs after reformatting: just after the same number of national digits
 * it followed before. Keeps mid-string edits from jumping to the end.
 */
export function caretAfterDigits(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return formatted.length === 0 ? 0 : 5; // after "+998 "
  let seen = 0;
  for (let i = 5; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) seen++;
    if (seen === digitsBefore) return i + 1;
  }
  return formatted.length;
}
