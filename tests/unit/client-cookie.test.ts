import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookie = {
  get: '',
  set: '',
};

Object.defineProperty(document, 'cookie', {
  get: () => mockCookie.get,
  set: (value: string) => {
    mockCookie.set = value;
    const parts = value.split(';')[0].split('=');
    if (parts.length === 2) {
      const name = parts[0].trim();
      const val = parts[1].trim();
      const existing = mockCookie.get.split('; ').filter(c => !c.startsWith(name + '='));
      mockCookie.get = [...existing, `${name}=${val}`].join('; ');
    }
  },
  configurable: true,
});

const { setCookie, getCookie } = await import('@/lib/client-cookie');

describe('client-cookie', () => {
  beforeEach(() => {
    mockCookie.get = '';
    mockCookie.set = '';
  });

  it('setCookie() sets a cookie with correct format', () => {
    setCookie('test', 'value');
    expect(mockCookie.set).toContain('test=');
    expect(mockCookie.set).toContain('expires=');
    expect(mockCookie.set).toContain('path=/');
  });

  it('setCookie() encodes special characters', () => {
    setCookie('test', 'hello world');
    expect(mockCookie.set).toContain('hello%20world');
  });

  it('setCookie() uses custom expiration days', () => {
    setCookie('test', 'value', 30);
    expect(mockCookie.set).toContain('expires=');
  });

  it('getCookie() returns null when cookie not found', () => {
    mockCookie.get = 'other=value';
    const result = getCookie('nonexistent');
    expect(result).toBeNull();
  });

  it('getCookie() returns cookie value', () => {
    mockCookie.get = 'test=hello';
    const result = getCookie('test');
    expect(result).toBe('hello');
  });

  it('getCookie() decodes encoded values', () => {
    mockCookie.get = 'test=hello%20world';
    const result = getCookie('test');
    expect(result).toBe('hello world');
  });

  it('getCookie() handles multiple cookies', () => {
    mockCookie.get = 'first=1; second=2; third=3';
    expect(getCookie('first')).toBe('1');
    expect(getCookie('second')).toBe('2');
    expect(getCookie('third')).toBe('3');
  });

  it('setCookie() and getCookie() round-trip correctly', () => {
    setCookie('roundtrip', 'test-value');
    const result = getCookie('roundtrip');
    expect(result).toBe('test-value');
  });
});
