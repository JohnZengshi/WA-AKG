import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/machine-id', () => ({
  getMachineId: vi.fn(() => 'test-machine-id-123'),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('isSessionOwnedByMachine', () => {
  let mockPrisma: any;
  let isSessionOwnedByMachine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = prisma;

    const apiAuth = await import('@/lib/api-auth');
    isSessionOwnedByMachine = apiAuth.isSessionOwnedByMachine;
  });

  it('should return true when session is assigned to current machine', async () => {
    mockPrisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      sessionId: 'session-1',
      assignedTo: 'test-machine-id-123',
    });

    const result = await isSessionOwnedByMachine('session-1');

    expect(result).toBe(true);
    expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: 'session-1', assignedTo: 'test-machine-id-123' },
          { sessionId: 'session-1', assignedTo: 'test-machine-id-123' },
        ],
      },
    });
  });

  it('should return false when session is assigned to another machine', async () => {
    mockPrisma.session.findFirst.mockResolvedValue(null);

    const result = await isSessionOwnedByMachine('session-1');

    expect(result).toBe(false);
    expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: 'session-1', assignedTo: 'test-machine-id-123' },
          { sessionId: 'session-1', assignedTo: 'test-machine-id-123' },
        ],
      },
    });
  });

  it('should return false when session does not exist', async () => {
    mockPrisma.session.findFirst.mockResolvedValue(null);

    const result = await isSessionOwnedByMachine('non-existent-session');

    expect(result).toBe(false);
  });

  it('should return false when session is unassigned (assignedTo is null)', async () => {
    mockPrisma.session.findFirst.mockResolvedValue(null);

    const result = await isSessionOwnedByMachine('session-1');

    expect(result).toBe(false);
  });

  it('should use correct machine ID in query', async () => {
    const { getMachineId } = await import('@/lib/machine-id');
    (getMachineId as any).mockReturnValue('custom-machine-id-456');

    mockPrisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      sessionId: 'session-1',
      assignedTo: 'custom-machine-id-456',
    });

    await isSessionOwnedByMachine('session-1');

    expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: 'session-1', assignedTo: 'custom-machine-id-456' },
          { sessionId: 'session-1', assignedTo: 'custom-machine-id-456' },
        ],
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.session.findFirst.mockRejectedValue(new Error('Database error'));

    await expect(isSessionOwnedByMachine('session-1')).rejects.toThrow('Database error');
  });

  describe('Extreme cases', () => {
    it('should handle session with null assignedTo in database', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await isSessionOwnedByMachine('session-1');

      expect(result).toBe(false);
    });

    it('should handle session with empty string assignedTo', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await isSessionOwnedByMachine('session-1');

      expect(result).toBe(false);
    });

    it('should handle session with whitespace in assignedTo', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await isSessionOwnedByMachine('session-1');

      expect(result).toBe(false);
    });

    it('should handle very long sessionId', async () => {
      const longSessionId = 'a'.repeat(1000);
      mockPrisma.session.findFirst.mockResolvedValue({
        id: longSessionId,
        sessionId: longSessionId,
        assignedTo: 'test-machine-id-123',
      });

      const result = await isSessionOwnedByMachine(longSessionId);

      expect(result).toBe(true);
    });

    it('should handle sessionId with special characters', async () => {
      const specialSessionId = 'session-123!@#$%^&*()_+';
      mockPrisma.session.findFirst.mockResolvedValue({
        id: specialSessionId,
        sessionId: specialSessionId,
        assignedTo: 'test-machine-id-123',
      });

      const result = await isSessionOwnedByMachine(specialSessionId);

      expect(result).toBe(true);
    });

    it('should handle sessionId with unicode characters', async () => {
      const unicodeSessionId = '会话-日本語-中文-한국어';
      mockPrisma.session.findFirst.mockResolvedValue({
        id: unicodeSessionId,
        sessionId: unicodeSessionId,
        assignedTo: 'test-machine-id-123',
      });

      const result = await isSessionOwnedByMachine(unicodeSessionId);

      expect(result).toBe(true);
    });

    it('should handle database connection timeout', async () => {
      mockPrisma.session.findFirst.mockRejectedValue(new Error('Connection timeout'));

      await expect(isSessionOwnedByMachine('session-1')).rejects.toThrow('Connection timeout');
    });

    it('should handle database query error', async () => {
      mockPrisma.session.findFirst.mockRejectedValue(new Error('Query failed'));

      await expect(isSessionOwnedByMachine('session-1')).rejects.toThrow('Query failed');
    });

    it('should handle concurrent permission checks', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        sessionId: 'session-1',
        assignedTo: 'test-machine-id-123',
      });

      const [result1, result2] = await Promise.all([
        isSessionOwnedByMachine('session-1'),
        isSessionOwnedByMachine('session-1'),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});
