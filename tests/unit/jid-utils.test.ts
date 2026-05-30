import { describe, it, expect } from 'vitest';
import { isLidJid, normalizeJid } from '@/lib/jid-utils';

describe('jid-utils', () => {
  describe('isLidJid', () => {
    it('should return true for @lid JIDs', () => {
      expect(isLidJid('123456@lid')).toBe(true);
      expect(isLidJid('abc@lid')).toBe(true);
    });

    it('should return false for @s.whatsapp.net JIDs', () => {
      expect(isLidJid('123456@s.whatsapp.net')).toBe(false);
    });

    it('should return false for @g.us JIDs', () => {
      expect(isLidJid('123456@g.us')).toBe(false);
    });

    it('should return false for @c.us JIDs', () => {
      expect(isLidJid('123456@c.us')).toBe(false);
    });

    it('should return false for empty/null/undefined', () => {
      expect(isLidJid('')).toBe(false);
      expect(isLidJid(null)).toBe(false);
      expect(isLidJid(undefined)).toBe(false);
    });
  });

  describe('normalizeJid', () => {
    it('should convert @c.us to @s.whatsapp.net', () => {
      expect(normalizeJid('123456@c.us')).toBe('123456@s.whatsapp.net');
    });

    it('should keep @s.whatsapp.net unchanged', () => {
      expect(normalizeJid('123456@s.whatsapp.net')).toBe('123456@s.whatsapp.net');
    });

    it('should keep @g.us unchanged', () => {
      expect(normalizeJid('123456@g.us')).toBe('123456@g.us');
    });

    it('should keep @lid unchanged', () => {
      expect(normalizeJid('123456@lid')).toBe('123456@lid');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizeJid(null)).toBe('');
      expect(normalizeJid(undefined)).toBe('');
    });
  });
});
