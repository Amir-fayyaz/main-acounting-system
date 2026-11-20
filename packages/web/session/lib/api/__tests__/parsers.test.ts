import { parseSessionResponse } from '../parsers';

describe('parseSessionResponse', () => {
  it('should parse valid session response', () => {
    const data = {
      sessionId: 'sess-123',
      expiresAt: '2025-12-31T23:59:59Z',
      principal: {
        userId: 'user-123',
        displayName: 'علی رضایی',
        email: 'ali@example.com',
      },
    };

    const result = parseSessionResponse(data);
    expect(result).toEqual(data);
  });

  it('should throw for missing fields', () => {
    const data = {
      sessionId: 'sess-123',
      // missing expiresAt and principal
    };

    expect(() => parseSessionResponse(data)).toThrow('The API response does not match the expected contract.');
  });

  it('should throw for invalid principal', () => {
    const data = {
      sessionId: 'sess-123',
      expiresAt: '2025-12-31T23:59:59Z',
      principal: {
        userId: 'user-123',
        // missing displayName and email
      },
    };

    expect(() => parseSessionResponse(data)).toThrow('The API response does not match the expected contract.');
  });
});