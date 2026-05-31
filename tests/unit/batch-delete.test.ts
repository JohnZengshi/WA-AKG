import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
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

describe('Batch Delete Sessions', () => {
  let mockPrisma: any;
  let mockWaManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;
    const { waManager } = await import('@/modules/whatsapp/manager');
    mockWaManager = waManager;
  });

  describe('API Validation', () => {
    it('should reject empty sessionIds array', async () => {
      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: [] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('sessionIds array is required');
    });

    it('should reject non-array sessionIds', async () => {
      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: 'not-an-array' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('sessionIds array is required');
    });

    it('should reject batch size over 50', async () => {
      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const sessionIds = Array.from({ length: 51 }, (_, i) => `session-${i}`);
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Maximum 50 sessions per batch');
    });
  });

  describe('Delete Logic', () => {
    it('should delete sessions successfully', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1', 'session-2'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(true);
      expect(data.data.deleted).toBe(2);
      expect(data.data.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      mockWaManager.deleteSession
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'));

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1', 'session-2'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(1);
      expect(data.data.failed).toBe(1);
      expect(data.data.errors.length).toBe(1);
    });

    it('should handle timeout for slow deletions', async () => {
      mockWaManager.deleteSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      );

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
      expect(data.data.errors[0]).toContain('timed out');
    }, 35000);
  });

  describe('Edge Cases', () => {
    it('should handle single session deletion', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(1);
    });

    it('should handle maximum batch size (50)', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);
      const sessionIds = Array.from({ length: 50 }, (_, i) => `session-${i}`);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(50);
    });

    it('should handle duplicate session IDs', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-1', 'session-1', 'session-1'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(3);
    });

    it('should handle special characters in session IDs', async () => {
      mockWaManager.deleteSession.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/sessions/batch-delete/route');
      const request = new Request('http://localhost/api/sessions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ sessionIds: ['session-!@#$%^&*()'] }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(1);
    });
  });
});
