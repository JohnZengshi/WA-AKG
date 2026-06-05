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
  WhatsAppInstance: vi.fn().mockImplementation(function (this: any, sessionId, userId, io) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.io = io;
    this.isStopped = false;
    this.status = 'DISCONNECTED';
    this.qr = null;
    this.socket = {
      ev: {
        removeAllListeners: vi.fn(),
      },
      end: vi.fn(),
      logout: vi.fn(),
    };
    this.init = vi.fn().mockResolvedValue(undefined);
    this.destroy = vi.fn().mockResolvedValue(undefined);
    this.requestPairingCode = vi.fn();
  }),
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
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/browser-fingerprint', () => ({
  randomizeBrowser: vi.fn(() => ({ platform: 'test', version: '1.0' })),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn() },
  NextRequest: vi.fn(),
}));

vi.mock('@/modules/whatsapp/antispam', () => ({
  antispam: {
    clearSession: vi.fn(),
  },
}));

describe('WhatsAppManager Lifecycle', () => {
  let manager: WhatsAppManager;
  let mockPrisma: any;

  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  } as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;

    (WhatsAppManager as any).instance = undefined;
    manager = WhatsAppManager.getInstance();
    manager.io = mockIo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('stopSession', () => {
    it('should remove all event listeners before ending socket', async () => {
      const mockSocket = {
        ev: {
          removeAllListeners: vi.fn(),
        },
        end: vi.fn(),
      };
      const mockInstance = {
        isStopped: false,
        socket: mockSocket,
        status: 'CONNECTED',
        destroy: vi.fn().mockResolvedValue(undefined),
      } as any;

      (manager as any).sessions.set('session-1', mockInstance);

      mockPrisma.session.update.mockResolvedValue({ sessionId: 'session-1', status: 'STOPPED' });

      await manager.stopSession('session-1');

      expect(mockSocket.ev.removeAllListeners).toHaveBeenCalledWith('connection.update');
      expect(mockSocket.ev.removeAllListeners).toHaveBeenCalledWith('creds.update');
      expect(mockSocket.end).toHaveBeenCalledWith(undefined);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        data: { status: 'STOPPED', qr: null },
      });
      expect(mockIo.to).toHaveBeenCalledWith('session-1');
      expect(mockIo.emit).toHaveBeenCalledWith('connection.update', {
        status: 'STOPPED',
        qr: null,
        sessionId: 'session-1',
      });
    });

    it('should set isStopped flag to prevent auto-reconnect', async () => {
      const mockSocket = {
        ev: {
          removeAllListeners: vi.fn(),
        },
        end: vi.fn(),
      };
      const mockInstance = {
        isStopped: false,
        socket: mockSocket,
        status: 'CONNECTED',
        destroy: vi.fn().mockResolvedValue(undefined),
      } as any;

      (manager as any).sessions.set('session-1', mockInstance);
      mockPrisma.session.update.mockResolvedValue({});

      await manager.stopSession('session-1');

      expect(mockInstance.isStopped).toBe(true);
    });

    it('should handle missing instance gracefully', async () => {
      await expect(manager.stopSession('nonexistent')).resolves.not.toThrow();
      expect(mockPrisma.session.update).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('startSession', () => {
    it('should skip starting if instance is already CONNECTED', async () => {
      const existingInstance = {
        status: 'CONNECTED',
        destroy: vi.fn(),
      } as any;

      (manager as any).sessions.set('session-1', existingInstance);

      await manager.startSession('session-1');

      expect(mockPrisma.session.findUnique).not.toHaveBeenCalled();
    });

    it('should clean up old instance before creating new one', async () => {
      const oldSocket = {
        ev: {
          removeAllListeners: vi.fn(),
        },
        end: vi.fn(),
      };
      const oldInstance = {
        isStopped: false,
        socket: oldSocket,
        status: 'DISCONNECTED',
        destroy: vi.fn(),
      } as any;

      (manager as any).sessions.set('session-1', oldInstance);

      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-1',
        userId: 'user-1',
        status: 'STOPPED',
      });
      mockPrisma.session.update.mockResolvedValue({});

      await manager.startSession('session-1');

      expect(oldInstance.isStopped).toBe(true);
      expect(oldSocket.ev.removeAllListeners).toHaveBeenCalledWith('connection.update');
      expect(oldSocket.ev.removeAllListeners).toHaveBeenCalledWith('creds.update');
      expect(oldSocket.end).toHaveBeenCalledWith(undefined);
      const newInstance = (manager as any).sessions.get('session-1');
      expect(newInstance).toBeDefined();
      expect(newInstance.init).toHaveBeenCalled();
    });

    it('should sync database state after init', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-1',
        userId: 'user-1',
        status: 'STOPPED',
      });
      mockPrisma.session.update.mockResolvedValue({});

      await manager.startSession('session-1');

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        data: { status: 'DISCONNECTED', qr: null },
      });
    });

    it('should handle P2025 error gracefully when DB row is deleted concurrently', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-1',
        userId: 'user-1',
        status: 'STOPPED',
      });
      mockPrisma.session.update.mockRejectedValue({ code: 'P2025' });

      await expect(manager.startSession('session-1')).resolves.not.toThrow();

      const { logger } = await import('@/lib/logger');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log non-P2025 database errors but not throw (code swallows)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-1',
        userId: 'user-1',
        status: 'STOPPED',
      });
      mockPrisma.session.update.mockRejectedValue(new Error('Connection refused'));

      await expect(manager.startSession('session-1')).resolves.not.toThrow();

      const { logger } = await import('@/lib/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Manager',
        'Failed to sync session DB after start:',
        expect.any(Error),
      );
    });
  });

  describe('restartSession (stop + start sequence)', () => {
    it('should call stopSession followed by startSession with delay', async () => {
      const mockSocket = {
        ev: { removeAllListeners: vi.fn() },
        end: vi.fn(),
      };
      const instance = {
        isStopped: false,
        socket: mockSocket,
        status: 'CONNECTED',
        destroy: vi.fn().mockResolvedValue(undefined),
      } as any;

      (manager as any).sessions.set('session-1', instance);
      mockPrisma.session.update.mockResolvedValue({});

      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-1',
        userId: 'user-1',
        status: 'CONNECTED',
      });

      await manager.restartSession('session-1');

      const newInstance = (manager as any).sessions.get('session-1');
      expect(newInstance).toBeDefined();
      expect(newInstance.init).toHaveBeenCalled();
      expect(instance.isStopped).toBe(true);
    });

    it('should complete restart even if stopSession does not emit (non-existent start)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        sessionId: 'session-new',
        userId: 'user-1',
        status: 'DISCONNECTED',
      });
      mockPrisma.session.update.mockResolvedValue({});

      await manager.restartSession('session-new');

      const instance = (manager as any).sessions.get('session-new');
      expect(instance).toBeDefined();
      expect(instance.init).toHaveBeenCalled();
    });
  });
});
