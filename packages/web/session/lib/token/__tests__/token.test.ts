import { decodeJwtPayload, isTokenExpired } from '../token';

describe('decodeJwtPayload', () => {
  it('should decode valid JWT payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    
    const decoded = decodeJwtPayload(token);
    expect(decoded).toEqual({ userId: '123', exp: expect.any(Number) });
  });

  it('should return null for invalid token', () => {
    expect(decodeJwtPayload('invalid.token')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('should return true for expired token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    
    expect(isTokenExpired(token)).toBe(true);
  });

  it('should return false for valid token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    
    expect(isTokenExpired(token)).toBe(false);
  });

  it('should return true for token without exp', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: '123' })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    
    expect(isTokenExpired(token)).toBe(true);
  });

  it('should respect buffer seconds', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 20 })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    
    expect(isTokenExpired(token, 30)).toBe(true);
    expect(isTokenExpired(token, 10)).toBe(false);
  });
});
