import { describe, expect, it } from 'vitest';
import { normalizePersianText } from './persian-text-normalizer.js';

describe('normalizePersianText', () => {
  it('handles empty or whitespace strings', () => {
    expect(normalizePersianText('')).toBe('');
    expect(normalizePersianText('   ')).toBe('');
  });

  it('normalizes Arabic Yeh (ي, ى) to Persian Yeh (ی)', () => {
    expect(normalizePersianText('علي')).toBe('علی');
    expect(normalizePersianText('موسی')).toBe('موسی');
    expect(normalizePersianText('مصطفیٰ')).toBe('مصطفی');
  });

  it('normalizes Arabic Kaf (ك) to Persian Kaf (ک)', () => {
    expect(normalizePersianText('بانك كشاورزي')).toBe('بانک کشاورزی');
  });

  it('normalizes Teh Marbuta and Heh variants to Persian Heh (ه)', () => {
    expect(normalizePersianText('شرکة سهامی')).toBe('شرکه سهامی');
    expect(normalizePersianText('دانشگاهِ فردوسی')).toBe('دانشگاه فردوسی');
  });

  it('normalizes Alef variants (آ, أ, إ, ٱ) to simple Alef (ا)', () => {
    expect(normalizePersianText('آریا')).toBe('اریا');
    expect(normalizePersianText('احمد')).toBe('احمد');
    expect(normalizePersianText('ایران')).toBe('ایران');
  });

  it('removes Tatweel / Kashida', () => {
    expect(normalizePersianText('فــــولاد')).toBe('فولاد');
    expect(normalizePersianText('صـنـعـت')).toBe('صنعت');
  });

  it('removes diacritics / Harakat', () => {
    expect(normalizePersianText('شَرِکَتِ صَنعَتِی')).toBe('شرکت صنعتی');
  });

  it('normalizes Arabic-Indic and Persian digits to ASCII 0-9', () => {
    expect(normalizePersianText('فولاد ۱۲۳')).toBe('فولاد 123');
    expect(normalizePersianText('کد ٤٥٦')).toBe('کد 456');
  });

  it('replaces ZWNJ and multiple spaces with a single space', () => {
    expect(normalizePersianText('فولاد‌مبارکه')).toBe('فولاد مبارکه');
    expect(normalizePersianText('  شرکت   پتروشیمی   ایران  ')).toBe('شرکت پتروشیمی ایران');
  });

  it('lowercases Latin characters', () => {
    expect(normalizePersianText('PETRO Chemical CO.')).toBe('petro chemical co.');
  });

  it('identifies identical normalized names for duplicate detection', () => {
    const raw1 = '  شَرکَتِ فـــــولادِ مُبارَکه (سپاهان) ۱۲  ';
    const raw2 = 'شرکت فولاد مبارکه (سپاهان) 12';
    expect(normalizePersianText(raw1)).toBe(normalizePersianText(raw2));
  });
});
