import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'admin@admin.com', role: 'SUPERADMIN' }
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/modules/whatsapp/manager', () => ({
  waManager: {
    deleteSession: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'admin@admin.com',
    role: 'SUPERADMIN'
  }),
  canAccessSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/modules/whatsapp/antispam', () => ({
  antispam: {
    clearSession: vi.fn(),
  },
}));

describe('Batch Delete Sessions - Extended', () => {
  let mockWaManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { waManager } = await import('@/modules/whatsapp/manager');
    mockWaManager = waManager;

    const apiAuth = await import('@/lib/api-auth');
    vi.mocked(apiAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      email: 'admin@admin.com',
      role: 'SUPERADMIN'
    });
    vi.mocked(apiAuth.canAccessSession).mockResolvedValue(true);
  });

  describe('Access Check', () => {
    it('should reject if user cannot access session', async () => {
      const { canAccessSession } = await import('@/lib/api-auth');
      vi.mocked(canAccessSession).mockResolvedValue(false);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(0);
      expect(data.data.failed).toBe(1);
      expect(data.data.errors[0]).toContain('Forbidden');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Invalid JSON body');
    });

    it('should handle delete errors with proper messages', async () => {
      mockWaManager.deleteSession.mockRejectedValue(new Error('Database connection lost'));

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.data.failed).toBe(1);
      expect(data.data.errors[0]).toContain('Database connection lost');
    });

    it('should handle non-Error rejections', async () => {
      mockWaManager.deleteSession.mockRejectedValue('String error');

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.data.failed).toBe(1);
      expect(data.data.errors[0]).toContain('Unknown error');
    });
  });

  describe('Logger Integration', () => {
    it('should log batch delete results', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);
      const { logger } = await import('@/lib/logger');

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1', 'session-2'] }),
      });

      await POST(request as any);

      expect(logger.info).toHaveBeenCalledWith('Manager', expect.stringContaining('Batch delete'));
    });
  });
});
