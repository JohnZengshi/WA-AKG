import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMachineIdGetter } from '@/lib/machine-id';

describe('getMachineId', () => {
  const mockId = 'test-machine-id-123';
  const existsSyncMock = vi.fn();
  const readFileSyncMock = vi.fn();
  const writeFileSyncMock = vi.fn();
  const randomUUIDMock = vi.fn();
  let getMachineId: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    randomUUIDMock.mockReturnValue(mockId);

    getMachineId = createMachineIdGetter({
      existsSync: existsSyncMock,
      readFileSync: readFileSyncMock,
      writeFileSync: writeFileSyncMock,
      randomUUID: randomUUIDMock,
      isClient: false,
    });
  });

  it('should generate new machine ID when file does not exist', () => {
    existsSyncMock.mockReturnValue(false);

    const result = getMachineId();

    expect(result).toBe(mockId);
    expect(existsSyncMock).toHaveBeenCalled();
    expect(randomUUIDMock).toHaveBeenCalled();
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('.machine-id'),
      mockId,
      'utf-8'
    );
    expect(readFileSyncMock).not.toHaveBeenCalled();
  });

  it('should read existing machine ID when file exists', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(mockId);

    const result = getMachineId();

    expect(result).toBe(mockId);
    expect(existsSyncMock).toHaveBeenCalled();
    expect(readFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('.machine-id'),
      'utf-8'
    );
    expect(randomUUIDMock).not.toHaveBeenCalled();
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('should trim whitespace from existing machine ID', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(`  ${mockId}  \n`);

    const result = getMachineId();

    expect(result).toBe(mockId);
    expect(readFileSyncMock).toHaveBeenCalled();
  });

  it('should return empty string when file exists but is empty', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue('');

    const result = getMachineId();

    expect(result).toBe('');
    expect(readFileSyncMock).toHaveBeenCalled();
  });

  describe('Extreme cases', () => {
    it('should handle file with only whitespace', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('   \n\t  ');

      const result = getMachineId();

      expect(result).toBe('');
    });

    it('should handle file with multiple newlines', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('\n\n\nmachine-id-123\n\n\n');

      const result = getMachineId();

      expect(result).toBe('machine-id-123');
    });

    it('should handle file with tabs and spaces', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('\t\tmachine-id-123\t\t');

      const result = getMachineId();

      expect(result).toBe('machine-id-123');
    });

    it('should handle very long machine ID', () => {
      const longId = 'a'.repeat(1000);
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(longId);

      const result = getMachineId();

      expect(result).toBe(longId);
    });

    it('should handle machine ID with special characters', () => {
      const specialId = 'machine-id-123!@#$%^&*()_+';
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(specialId);

      const result = getMachineId();

      expect(result).toBe(specialId);
    });

    it('should handle machine ID with unicode characters', () => {
      const unicodeId = 'machine-id-日本語-中文-한국어';
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(unicodeId);

      const result = getMachineId();

      expect(result).toBe(unicodeId);
    });

    it('should handle file read permission error', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => getMachineId()).toThrow('EACCES: permission denied');
    });

    it('should handle file write permission error', () => {
      existsSyncMock.mockReturnValue(false);
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => getMachineId()).toThrow('EACCES: permission denied');

      writeFileSyncMock.mockReset();
    });

    it('should handle file system corruption', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('corrupted-data');

      const result = getMachineId();

      expect(result).toBe('corrupted-data');
    });

    it('should handle concurrent access', () => {
      existsSyncMock.mockReturnValue(false);
      randomUUIDMock.mockReturnValue('concurrent-id-1');

      const result1 = getMachineId();

      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('concurrent-id-1');

      const result2 = getMachineId();

      expect(result1).toBe('concurrent-id-1');
      expect(result2).toBe('concurrent-id-1');
    });
  });

  describe('Client-side mode', () => {
    it('should use localStorage in client mode', () => {
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });

      const getClientMachineId = createMachineIdGetter({
        existsSync: existsSyncMock,
        readFileSync: readFileSyncMock,
        writeFileSync: writeFileSyncMock,
        randomUUID: randomUUIDMock,
        isClient: true,
      });

      localStorageMock.getItem.mockReturnValue('client-machine-id');

      const result = getClientMachineId();

      expect(result).toBe('client-machine-id');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('wa-akg-machine-id');
      expect(existsSyncMock).not.toHaveBeenCalled();
    });

    it('should generate and store ID in localStorage when not exists', () => {
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });

      const getClientMachineId = createMachineIdGetter({
        existsSync: existsSyncMock,
        readFileSync: readFileSyncMock,
        writeFileSync: writeFileSyncMock,
        randomUUID: randomUUIDMock,
        isClient: true,
      });

      localStorageMock.getItem.mockReturnValue(null);
      randomUUIDMock.mockReturnValue('new-client-id');

      const result = getClientMachineId();

      expect(result).toBe('new-client-id');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('wa-akg-machine-id', 'new-client-id');
      expect(existsSyncMock).not.toHaveBeenCalled();
    });
  });
});
