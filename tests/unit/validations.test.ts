import { describe, it, expect } from 'vitest';
import { createGroupSchema, broadcastSchema, stickerSchema } from '@/lib/validations';

describe('validations', () => {
  describe('createGroupSchema', () => {
    it('should validate valid group creation data', () => {
      const validData = {
        sessionId: 'session-01',
        subject: 'Test Group',
        participants: ['123456@s.whatsapp.net', '789012@s.whatsapp.net'],
      };
      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty sessionId', () => {
      const invalidData = {
        sessionId: '',
        subject: 'Test Group',
        participants: ['123456@s.whatsapp.net'],
      };
      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty subject', () => {
      const invalidData = {
        sessionId: 'session-01',
        subject: '',
        participants: ['123456@s.whatsapp.net'],
      };
      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject subject longer than 100 chars', () => {
      const invalidData = {
        sessionId: 'session-01',
        subject: 'a'.repeat(101),
        participants: ['123456@s.whatsapp.net'],
      };
      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid participant JID format', () => {
      const invalidData = {
        sessionId: 'session-01',
        subject: 'Test Group',
        participants: ['invalid-jid'],
      };
      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty participants array', () => {
      const invalidData = {
        sessionId: 'session-01',
        subject: 'Test Group',
        participants: [],
      };
      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('broadcastSchema', () => {
    it('should validate valid broadcast data', () => {
      const validData = {
        sessionId: 'session-01',
        recipients: ['123456@s.whatsapp.net'],
        message: 'Hello World',
      };
      const result = broadcastSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default delay of 2000', () => {
      const validData = {
        sessionId: 'session-01',
        recipients: ['123456@s.whatsapp.net'],
        message: 'Hello World',
      };
      const result = broadcastSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delay).toBe(2000);
      }
    });

    it('should reject delay below 500', () => {
      const invalidData = {
        sessionId: 'session-01',
        recipients: ['123456@s.whatsapp.net'],
        message: 'Hello World',
        delay: 100,
      };
      const result = broadcastSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty message', () => {
      const invalidData = {
        sessionId: 'session-01',
        recipients: ['123456@s.whatsapp.net'],
        message: '',
      };
      const result = broadcastSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('stickerSchema', () => {
    it('should validate valid sticker data', () => {
      const validData = {
        sessionId: 'session-01',
        jid: '123456@s.whatsapp.net',
      };
      const result = stickerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty sessionId', () => {
      const invalidData = {
        sessionId: '',
        jid: '123456@s.whatsapp.net',
      };
      const result = stickerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty jid', () => {
      const invalidData = {
        sessionId: 'session-01',
        jid: '',
      };
      const result = stickerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
