import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppManager } from '@/modules/whatsapp/manager';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/machine-id', () => ({
  getMachineId: vi.fn(() => 'test-machine-id-123'),
}));

vi.mock('@/modules/whatsapp/instance', () => ({
  WhatsAppInstance: class {
    sessionId: string;
    userId: string;
    io: any;
    init = vi.fn().mockResolvedValue(undefined);

    constructor(sessionId: string, userId: string, io: any) {
      this.sessionId = sessionId;
      this.userId = userId;
      this.io = io;
    }
  },
}));

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })),
}));

vi.mock('@/lib/cron', () => ({
  initScheduler: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/browser-fingerprint', () => ({
  randomizeBrowser: vi.fn(() => ({ platform: 'test', version: '1.0' })),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn(),
  },
  NextRequest: vi.fn(),
}));

describe('Session Assignment Integration Tests', () => {
  let manager: WhatsAppManager;
  let mockPrisma: any;
  let isSessionOwnedByMachine: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;

    const apiAuth = await import('@/lib/api-auth');
    isSessionOwnedByMachine = apiAuth.isSessionOwnedByMachine;

    (WhatsAppManager as any).instance = undefined;
    manager = WhatsAppManager.getInstance();

    manager.io = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as any;
  });

  describe('Full Session Lifecycle', () => {
    it('should create session, load it, and verify ownership', async () => {
      const mockSession = {
        id: 'session-1',
        sessionId: 'session-1',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);
      mockPrisma.session.findMany.mockResolvedValue([mockSession]);
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const createdSession = await manager.createSession('user-1', 'Test Session', 'session-1');
      expect(createdSession.assignedTo).toBe('test-machine-id-123');

      await manager.loadSessions();
      expect(mockPrisma.session.findMany).toHaveBeenCalled();

      const isOwned = await isSessionOwnedByMachine('session-1');
      expect(isOwned).toBe(true);
    });

    it('should handle session deletion and ownership check', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);
      mockPrisma.session.delete.mockResolvedValue({});

      const isOwned = await isSessionOwnedByMachine('deleted-session');
      expect(isOwned).toBe(false);
    });
  });

  describe('Multi-Session Scenarios', () => {
    it('should handle multiple sessions with different owners', async () => {
      const sessions = [
        { sessionId: 'session-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
        { sessionId: 'session-2', assignedTo: 'other-machine-id', status: 'CONNECTED' },
        { sessionId: 'session-3', assignedTo: null, status: 'DISCONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'session-3' },
        data: { assignedTo: 'test-machine-id-123' }
      });
    });

    it('should handle rapid session creation', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-${i}`,
        userId: 'user-1',
        name: `Session ${i}`,
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      }));

      mockPrisma.session.create.mockResolvedValue(sessions[0]);

      for (const session of sessions) {
        await manager.createSession('user-1', session.name, session.sessionId);
      }

      expect(mockPrisma.session.create).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from database connection failure', async () => {
      mockPrisma.session.findMany
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce([]);

      await expect(manager.loadSessions()).rejects.toThrow('Connection lost');

      await manager.loadSessions();
      expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle partial update failures', async () => {
      const sessions = [
        { sessionId: 'session-1', assignedTo: null, status: 'CONNECTED' },
        { sessionId: 'session-2', assignedTo: null, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.update
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(manager.loadSessions()).rejects.toThrow('Update failed');
    });

    it('should handle concurrent loadSessions calls', async () => {
      const sessions = [
        { sessionId: 'session-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const [result1, result2] = await Promise.all([
        manager.loadSessions(),
        manager.loadSessions(),
      ]);

      expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('Permission Check Integration', () => {
    it('should verify ownership before allowing operations', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        sessionId: 'session-1',
        assignedTo: 'test-machine-id-123',
      });

      const isOwned = await isSessionOwnedByMachine('session-1');
      expect(isOwned).toBe(true);

      mockPrisma.session.findFirst.mockResolvedValue(null);

      const isNotOwned = await isSessionOwnedByMachine('session-1');
      expect(isNotOwned).toBe(false);
    });

    it('should handle permission checks for multiple sessions', async () => {
      const sessions = ['session-1', 'session-2', 'session-3'];

      mockPrisma.session.findFirst
        .mockResolvedValueOnce({ id: 'session-1', assignedTo: 'test-machine-id-123' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'session-3', assignedTo: 'test-machine-id-123' });

      const results = await Promise.all(
        sessions.map(s => isSessionOwnedByMachine(s))
      );

      expect(results).toEqual([true, false, true]);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between create and load', async () => {
      const mockSession = {
        sessionId: 'session-1',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);
      mockPrisma.session.findMany.mockResolvedValue([mockSession]);

      await manager.createSession('user-1', 'Test Session', 'session-1');
      await manager.loadSessions();

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        where: {
          status: { not: 'LOGGED_OUT' },
          OR: [
            { assignedTo: 'test-machine-id-123' },
            { assignedTo: null }
          ]
        }
      });
    });

    it('should handle database schema changes gracefully', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await manager.loadSessions();

      expect(mockPrisma.session.findMany).toHaveBeenCalled();
    });
  });

  describe('Edge Cases - Data Types', () => {
    it('should handle sessions with various assignedTo values', async () => {
      const sessions = [
        { sessionId: 's1', assignedTo: 'test-machine-id-123' },
        { sessionId: 's2', assignedTo: '' },
        { sessionId: 's3', assignedTo: null },
        { sessionId: 's4', assignedTo: undefined },
        { sessionId: 's5', assignedTo: 'very-long-id'.repeat(100) },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledTimes(1);
    });

    it('should handle sessions with special characters in sessionId', async () => {
      const specialSessionId = 'session-123!@#$%^&*()_+';
      const mockSession = {
        sessionId: specialSessionId,
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const isOwned = await isSessionOwnedByMachine(specialSessionId);
      expect(isOwned).toBe(true);
    });

    it('should handle sessions with unicode characters', async () => {
      const unicodeSessionId = '会话-日本語-中文-한국어';
      const mockSession = {
        sessionId: unicodeSessionId,
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const isOwned = await isSessionOwnedByMachine(unicodeSessionId);
      expect(isOwned).toBe(true);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle large number of sessions efficiently', async () => {
      const sessions = Array.from({ length: 1000 }, (_, i) => ({
        sessionId: `session-${i}`,
        assignedTo: i % 2 === 0 ? 'test-machine-id-123' : null,
        status: 'CONNECTED',
      }));

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.update.mockResolvedValue({});

      const startTime = Date.now();
      await manager.loadSessions();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
      expect(mockPrisma.session.update).toHaveBeenCalledTimes(500);
    });

    it('should handle rapid permission checks', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        assignedTo: 'test-machine-id-123',
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, () =>
        isSessionOwnedByMachine('session-1')
      );
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty sessionId', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const isOwned = await isSessionOwnedByMachine('');
      expect(isOwned).toBe(false);
    });

    it('should handle null sessionId', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const isOwned = await isSessionOwnedByMachine(null as any);
      expect(isOwned).toBe(false);
    });

    it('should handle undefined sessionId', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const isOwned = await isSessionOwnedByMachine(undefined as any);
      expect(isOwned).toBe(false);
    });

    it('should handle very long sessionId', async () => {
      const longSessionId = 'a'.repeat(10000);
      mockPrisma.session.findFirst.mockResolvedValue({
        id: longSessionId,
        assignedTo: 'test-machine-id-123',
      });

      const isOwned = await isSessionOwnedByMachine(longSessionId);
      expect(isOwned).toBe(true);
    });
  });
});
