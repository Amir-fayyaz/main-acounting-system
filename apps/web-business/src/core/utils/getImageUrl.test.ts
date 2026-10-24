import { describe, expect, it } from 'vitest';
import { getImageUrl } from './getImageUrl';

describe('getImageUrl', () => {
  it('should return empty string for null or undefined', () => {
    expect(getImageUrl(null)).toBe('');
    expect(getImageUrl(undefined)).toBe('');
  });

  it('should return empty string for empty path', () => {
    expect(getImageUrl('')).toBe('');
  });

  it('should return blob url as-is', () => {
    const blob = 'blob:http://localhost:3000/some-uuid';

    expect(getImageUrl(blob)).toBe(blob);
  });

  it('should return full http url as-is', () => {
    expect(getImageUrl('http://example.com/img.png')).toBe('http://example.com/img.png');
    expect(getImageUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
  });

  it('should prefix localhost base to path starting with /', () => {
    expect(getImageUrl('/uploads/products/img.png')).toBe(
      'http://localhost:3000/uploads/products/img.png',
    );
  });

  it('should prefix full uploads path for bare filename', () => {
    expect(getImageUrl('img.png')).toBe('http://localhost:3000/uploads/products/img.png');
  });
});
