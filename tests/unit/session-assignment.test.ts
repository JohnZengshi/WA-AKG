import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppManager } from '@/modules/whatsapp/manager';

vi.mock('@/lib/machine-id', () => ({
  getMachineId: vi.fn(() => 'test-machine-id-123'),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
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

describe('Session Assignment', () => {
  let manager: WhatsAppManager;
  let mockPrisma: any;
  let mockGetMachineId: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;

    const { getMachineId } = await import('@/lib/machine-id');
    mockGetMachineId = getMachineId;

    (WhatsAppManager as any).instance = undefined;
    manager = WhatsAppManager.getInstance();

    manager.io = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as any;
  });

  describe('loadSessions', () => {
    it('should load only sessions assigned to current machine', async () => {
      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
        { sessionId: 'session-2', userId: 'user-2', assignedTo: 'test-machine-id-123', status: 'DISCONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

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

    it('should load unassigned sessions (assignedTo IS NULL)', async () => {
      const mockSessions = [
        { sessionId: 'unassigned-1', userId: 'user-1', assignedTo: null, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

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

    it('should auto-bind unassigned sessions to current machine', async () => {
      const mockSessions = [
        { sessionId: 'unassigned-1', userId: 'user-1', assignedTo: null, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'unassigned-1' },
        data: { assignedTo: 'test-machine-id-123' }
      });
    });

    it('should not re-bind sessions already assigned to current machine', async () => {
      const mockSessions = [
        { sessionId: 'assigned-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });

    it('should not load LOGGED_OUT sessions', async () => {
      const mockSessions: any[] = [];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

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

    it('should handle empty sessions list', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await manager.loadSessions();

      expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should automatically set assignedTo to current machine ID', async () => {
      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', 'Test Session', 'new-session-1');

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Test Session',
          sessionId: 'new-session-1',
          status: 'DISCONNECTED',
          assignedTo: 'test-machine-id-123',
          config: { browserFingerprint: { platform: 'test', version: '1.0' } },
          botConfig: {
            create: {
              enabled: true,
              botMode: 'OWNER',
              autoReplyMode: 'ALL'
            }
          }
        }
      });

      expect(result).toEqual(mockSession);
    });

    it('should generate random session ID if not provided', async () => {
      const mockSession = {
        sessionId: 'random-id',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', 'Test Session');

      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should include proxyUrl in config if provided', async () => {
      const mockSession = {
        sessionId: 'proxy-session',
        userId: 'user-1',
        name: 'Proxy Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', 'Proxy Session', 'proxy-session', 'http://proxy.example.com');

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Proxy Session',
          sessionId: 'proxy-session',
          status: 'DISCONNECTED',
          assignedTo: 'test-machine-id-123',
          config: {
            browserFingerprint: { platform: 'test', version: '1.0' },
            proxyUrl: 'http://proxy.example.com'
          },
          botConfig: {
            create: {
              enabled: true,
              botMode: 'OWNER',
              autoReplyMode: 'ALL'
            }
          }
        }
      });

      expect(result).toEqual(mockSession);
    });
  });

  describe('Cross-machine isolation', () => {
    it('should not load sessions assigned to another machine', async () => {
      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

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

      expect(mockSessions).toHaveLength(1);
    });

    it('should use different machine ID for different machines', async () => {
      mockGetMachineId.mockReturnValue('different-machine-id-456');

      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: 'different-machine-id-456', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      await manager.loadSessions();

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        where: {
          status: { not: 'LOGGED_OUT' },
          OR: [
            { assignedTo: 'different-machine-id-456' },
            { assignedTo: null }
          ]
        }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple unassigned sessions', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = [
        { sessionId: 'unassigned-1', userId: 'user-1', assignedTo: null, status: 'CONNECTED' },
        { sessionId: 'unassigned-2', userId: 'user-2', assignedTo: null, status: 'DISCONNECTED' },
        { sessionId: 'unassigned-3', userId: 'user-3', assignedTo: null, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'unassigned-1' },
        data: { assignedTo: 'test-machine-id-123' }
      });
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'unassigned-2' },
        data: { assignedTo: 'test-machine-id-123' }
      });
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'unassigned-3' },
        data: { assignedTo: 'test-machine-id-123' }
      });
    });

    it('should handle mixed assigned and unassigned sessions', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = [
        { sessionId: 'assigned-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
        { sessionId: 'unassigned-1', userId: 'user-2', assignedTo: null, status: 'DISCONNECTED' },
        { sessionId: 'assigned-2', userId: 'user-3', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'unassigned-1' },
        data: { assignedTo: 'test-machine-id-123' }
      });
    });

    it('should log machine ID on load', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const { logger } = await import('@/lib/logger');
      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      await manager.loadSessions();

      expect(logger.info).toHaveBeenCalledWith('Manager', 'Machine ID: test-machine-id-123');
    });

    it('should log success with bound count', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const { logger } = await import('@/lib/logger');
      const mockSessions = [
        { sessionId: 'assigned-1', userId: 'user-1', assignedTo: 'test-machine-id-123', status: 'CONNECTED' },
        { sessionId: 'unassigned-1', userId: 'user-2', assignedTo: null, status: 'DISCONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(logger.success).toHaveBeenCalledWith('Manager', 'Loaded 2 sessions. Bound 1 unassigned sessions.');
    });

    it('should throw error if Socket.IO not initialized', async () => {
      manager.io = null;

      await expect(manager.loadSessions()).rejects.toThrow('Socket.IO not initialized in WhatsAppManager');
    });
  });

  describe('createSession edge cases', () => {
    it('should throw error if Socket.IO not initialized', async () => {
      manager.io = null;
      (global as any).io = undefined;

      await expect(manager.createSession('user-1', 'Test Session')).rejects.toThrow('Socket.IO not initialized');
    });

    it('should use global io as fallback', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      manager.io = null;
      (global as any).io = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', 'Test Session', 'new-session-1');

      expect(result).toEqual(mockSession);
    });

    it('should create botConfig with default values', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: 'Test Session',
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      await manager.createSession('user-1', 'Test Session', 'new-session-1');

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Test Session',
          sessionId: 'new-session-1',
          status: 'DISCONNECTED',
          assignedTo: 'test-machine-id-123',
          config: { browserFingerprint: { platform: 'test', version: '1.0' } },
          botConfig: {
            create: {
              enabled: true,
              botMode: 'OWNER',
              autoReplyMode: 'ALL'
            }
          }
        }
      });
    });

    it('should handle database errors in createSession', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');
      mockPrisma.session.create.mockRejectedValue(new Error('Database error'));

      await expect(manager.createSession('user-1', 'Test Session', 'new-session-1')).rejects.toThrow('Database error');
    });

    it('should handle very long session name', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const longName = 'A'.repeat(1000);
      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: longName,
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', longName, 'new-session-1');

      expect(result.name).toBe(longName);
    });

    it('should handle special characters in session name', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const specialName = 'Session !@#$%^&*()_+-=[]{}|;:,.<>?';
      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: specialName,
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', specialName, 'new-session-1');

      expect(result.name).toBe(specialName);
    });

    it('should handle unicode characters in session name', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const unicodeName = '会话-日本語-中文-한국어';
      const mockSession = {
        sessionId: 'new-session-1',
        userId: 'user-1',
        name: unicodeName,
        status: 'DISCONNECTED',
        assignedTo: 'test-machine-id-123',
      };

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await manager.createSession('user-1', unicodeName, 'new-session-1');

      expect(result.name).toBe(unicodeName);
    });
  });

  describe('loadSessions extreme cases', () => {
    it('should handle database connection timeout', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');
      mockPrisma.session.findMany.mockRejectedValue(new Error('Connection timeout'));

      await expect(manager.loadSessions()).rejects.toThrow('Connection timeout');
    });

    it('should handle database query error', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');
      mockPrisma.session.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(manager.loadSessions()).rejects.toThrow('Query failed');
    });

    it('should handle update error for unassigned sessions', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = [
        { sessionId: 'unassigned-1', userId: 'user-1', assignedTo: null, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockRejectedValue(new Error('Update failed'));

      await expect(manager.loadSessions()).rejects.toThrow('Update failed');
    });

    it('should handle sessions with undefined assignedTo', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: undefined, status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });

    it('should handle sessions with empty string assignedTo', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = [
        { sessionId: 'session-1', userId: 'user-1', assignedTo: '', status: 'CONNECTED' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      await manager.loadSessions();

      expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });

    it('should handle very large number of sessions', async () => {
      mockGetMachineId.mockReturnValue('test-machine-id-123');

      const mockSessions = Array.from({ length: 1000 }, (_, i) => ({
        sessionId: `session-${i}`,
        userId: `user-${i}`,
        assignedTo: i % 2 === 0 ? 'test-machine-id-123' : null,
        status: 'CONNECTED',
      }));

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.loadSessions();

      expect(mockPrisma.session.update).toHaveBeenCalledTimes(500);
    });
  });
});
