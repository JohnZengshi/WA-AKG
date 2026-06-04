import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
    },
    webhook: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'admin@admin.com',
    role: 'SUPERADMIN',
  }),
  canAccessSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Webhook Session ID Resolution (OR query)', () => {
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;
  });

  describe('GET /api/webhooks/[sessionId]', () => {
    it('should resolve by internal CUID (id)', async () => {
      const internalId = 'clx123456789abcdef';
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/' + internalId);
      const response = await GET(request, { params: Promise.resolve({ sessionId: internalId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: internalId }, { sessionId: internalId }],
        },
        select: { id: true },
      });
      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ sessionId: internalId }),
            ]),
          }),
        }),
      );
    });

    it('should resolve by WhatsApp string sessionId', async () => {
      const waSessionId = 'status@broadcast';
      const internalId = 'clx987654321fedcba';
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/' + waSessionId);
      const response = await GET(request, { params: Promise.resolve({ sessionId: waSessionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: waSessionId }, { sessionId: waSessionId }],
        },
        select: { id: true },
      });
      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ sessionId: internalId }),
              expect.objectContaining({ sessionId: null }),
            ]),
          }),
        }),
      );
    });

    it('should return 404 when sessionId matches neither id nor sessionId', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ sessionId: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe('Session not found');
    });

    it('should resolve correctly when id and sessionId are same value', async () => {
      const sameValue = 'clx_short_id';
      const internalId = sameValue;
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/' + sameValue);
      const response = await GET(request, { params: Promise.resolve({ sessionId: sameValue }) });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/webhooks/[sessionId]', () => {
    it('should resolve sessionId and create webhook linked to internal id', async () => {
      const waSessionId = 'user@whatsapp.net';
      const internalId = 'clx111111111111111';
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.create.mockResolvedValue({
        id: 'wh_1',
        userId: 'user-1',
        name: 'My Webhook',
        url: 'https://example.com/hook',
        sessionId: internalId,
        events: ['message.upsert'],
        isActive: true,
      });

      const { POST } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/' + waSessionId, {
        method: 'POST',
        body: JSON.stringify({
          name: 'My Webhook',
          url: 'https://example.com/hook',
          events: ['message.upsert'],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ sessionId: waSessionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: waSessionId }, { sessionId: waSessionId }],
        },
        select: { id: true },
      });
      expect(mockPrisma.webhook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: internalId,
          }),
        }),
      );
    });

    it('should return 404 when session not found in POST', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const { POST } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/nonexistent', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          url: 'https://example.com/hook',
          events: ['message.upsert'],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ sessionId: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/webhooks/[sessionId]/[id]', () => {
    it('should resolve sessionId when updating a webhook', async () => {
      const waSessionId = 'group@whatsapp.net';
      const internalId = 'clx222222222222222';
      const webhookId = 'wh_123';
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.findFirst.mockResolvedValue({ id: webhookId, userId: 'user-1' });
      mockPrisma.webhook.update.mockResolvedValue({ id: webhookId });

      const { PUT } = await import('@/app/api/webhooks/[sessionId]/[id]/route');
      const request = new Request(
        'http://localhost/api/webhooks/' + waSessionId + '/' + webhookId,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        },
      );
      const response = await PUT(request, {
        params: Promise.resolve({ sessionId: waSessionId, id: webhookId }),
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: waSessionId }, { sessionId: waSessionId }],
        },
        select: { id: true },
      });
    });
  });

  describe('DELETE /api/webhooks/[sessionId]/[id]', () => {
    it('should resolve sessionId when deleting a webhook', async () => {
      const waSessionId = 'session-abc-123';
      const internalId = 'clx333333333333333';
      const webhookId = 'wh_456';
      mockPrisma.session.findFirst.mockResolvedValue({ id: internalId });
      mockPrisma.webhook.findFirst.mockResolvedValue({ id: webhookId, userId: 'user-1' });
      mockPrisma.webhook.delete.mockResolvedValue({ id: webhookId });

      const { DELETE } = await import('@/app/api/webhooks/[sessionId]/[id]/route');
      const request = new Request(
        'http://localhost/api/webhooks/' + waSessionId + '/' + webhookId,
        { method: 'DELETE' },
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: waSessionId, id: webhookId }),
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: waSessionId }, { sessionId: waSessionId }],
        },
        select: { id: true },
      });
    });

    it('should return 404 when session not found in DELETE', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const { DELETE } = await import('@/app/api/webhooks/[sessionId]/[id]/route');
      const request = new Request('http://localhost/api/webhooks/nonexistent/wh_1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: 'nonexistent', id: 'wh_1' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Ambiguity and edge cases', () => {
    it('should handle query where id and sessionId fields overlap between records', async () => {
      const ambiguousValue = 'overlap-id';
      const resolvedId = 'some-internal-id';
      mockPrisma.session.findFirst.mockResolvedValue({ id: resolvedId });
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/' + ambiguousValue);
      const response = await GET(request, {
        params: Promise.resolve({ sessionId: ambiguousValue }),
      });

      expect(response.status).toBe(200);
    });

    it('should reject unauthorized access before session resolution', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-auth');
      (getAuthenticatedUser as any).mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/webhooks/[sessionId]/route');
      const request = new Request('http://localhost/api/webhooks/session-1');
      const response = await GET(request, { params: Promise.resolve({ sessionId: 'session-1' }) });

      expect(response.status).toBe(401);
      expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
    });
  });
});
