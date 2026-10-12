import { describe, expect, it } from 'vitest';
import { caretAfterDigits, formatNational, formatPhoneInput, isCompletePhone, maskPhone, nationalDigits, toE164 } from './phone';

describe('nationalDigits', () => {
  it.each([
    ['+998 90 123-45-67', '901234567'],
    ['+998901234567', '901234567'],
    ['998901234567', '901234567'],
    ['901234567', '901234567'],
    ['0 90 123 45 67', '901234567'],
    ['(90) 123-45-67', '901234567'],
  ])('normalises %s', (input, want) => expect(nationalDigits(input)).toBe(want));

  it('treats digits after a typed +998 prefix as national, even when they start with 99/98', () => {
    expect(nationalDigits('+998 99')).toBe('99');
    expect(nationalDigits('+998 998')).toBe('998');
    expect(nationalDigits('+99899812')).toBe('99812');
  });

  it('caps at nine digits', () => expect(nationalDigits('+998 90 123-45-67 89')).toBe('901234567'));
});

describe('formatting', () => {
  it('formats progressively', () => {
    expect(formatNational('')).toBe('');
    expect(formatNational('9')).toBe('+998 9');
    expect(formatNational('901')).toBe('+998 90 1');
    expect(formatNational('901234')).toBe('+998 90 123-4');
    expect(formatNational('90123456')).toBe('+998 90 123-45-6');
    expect(formatNational('901234567')).toBe('+998 90 123-45-67');
  });

  it('formats pasted numbers', () => expect(formatPhoneInput('998901234567')).toBe('+998 90 123-45-67'));

  it('validates and converts to E.164', () => {
    expect(isCompletePhone('+998 90 123-45-6')).toBe(false);
    expect(toE164('+998 90 123-45-6')).toBeNull();
    expect(toE164('+998 90 123-45-67')).toBe('+998901234567');
  });

  it('masks for logs', () => {
    expect(maskPhone('+998901234567')).toBe('+998 90 *** ** 67');
    expect(maskPhone('garbage')).toBe('***');
  });

  it('keeps the caret after the same digit', () => {
    const f = '+998 90 123-45-67';
    expect(caretAfterDigits(f, 0)).toBe(5);
    expect(caretAfterDigits(f, 2)).toBe(7);
    expect(caretAfterDigits(f, 3)).toBe(9);
    expect(caretAfterDigits(f, 9)).toBe(f.length);
  });
});
