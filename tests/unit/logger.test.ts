import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/lib/logger';

// Helper to strip ANSI color codes for easier testing
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('info() logs with INFO tag', () => {
    logger.info('Test', 'Hello world');
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleLogSpy.mock.calls[0][0] as string);
    expect(call).toContain('INFO');
    expect(call).toContain('[Test]');
    expect(call).toContain('Hello world');
  });

  it('success() logs with OK tag', () => {
    logger.success('Session', 'Connected');
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleLogSpy.mock.calls[0][0] as string);
    expect(call).toContain('OK');
    expect(call).toContain('[Session]');
    expect(call).toContain('Connected');
  });

  it('warn() logs with WARN tag', () => {
    logger.warn('Scheduler', 'No messages');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleWarnSpy.mock.calls[0][0] as string);
    expect(call).toContain('WARN');
    expect(call).toContain('[Scheduler]');
    expect(call).toContain('No messages');
  });

  it('error() logs with ERR! tag', () => {
    logger.error('API', 'Request failed');
    expect(consoleErrorSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleErrorSpy.mock.calls[0][0] as string);
    expect(call).toContain('ERR!');
    expect(call).toContain('[API]');
    expect(call).toContain('Request failed');
  });

  it('debug() logs in non-production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    logger.debug('Store', 'Processing');
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleLogSpy.mock.calls[0][0] as string);
    expect(call).toContain('DBG');
    expect(call).toContain('[Store]');
    
    process.env.NODE_ENV = originalEnv;
  });

  it('debug() does not log in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    logger.debug('Store', 'Processing');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('handles Error objects in arguments', () => {
    const error = new Error('Test error');
    logger.error('Test', error);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleErrorSpy.mock.calls[0][0] as string);
    expect(call).toContain('Test error');
  });

  it('handles multiple arguments', () => {
    logger.info('Test', 'arg1', 'arg2', 'arg3');
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = stripAnsi(consoleLogSpy.mock.calls[0][0] as string);
    expect(call).toContain('arg1 arg2 arg3');
  });

  it('banner() outputs formatted banner', () => {
    logger.banner('WA-AKG', '1.0.0', 3000);
    expect(consoleLogSpy).toHaveBeenCalled();
    const calls = consoleLogSpy.mock.calls.map(c => stripAnsi(c[0] as string)).join('\n');
    expect(calls).toContain('WA-AKG');
    expect(calls).toContain('v1.0.0');
    expect(calls).toContain('localhost:3000');
  });
});
