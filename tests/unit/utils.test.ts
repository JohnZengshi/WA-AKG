import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() - Tailwind class merge utility', () => {
  it('merges multiple class strings', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('handles conditional classes with clsx', () => {
    const result = cn('base', true && 'active', false && 'inactive');
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('inactive');
  });

  it('merges conflicting Tailwind classes (twMerge)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles array inputs', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('handles object inputs', () => {
    const result = cn({ 'class1': true, 'class2': false });
    expect(result).toContain('class1');
    expect(result).not.toContain('class2');
  });

  it('handles undefined and null inputs', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toContain('base');
    expect(result).toContain('end');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles complex Tailwind merging', () => {
    const result = cn(
      'px-4 py-2',
      'px-6',
      'bg-red-500',
      'bg-blue-500'
    );
    expect(result).toContain('py-2');
    expect(result).toContain('px-6');
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('px-4');
    expect(result).not.toContain('bg-red-500');
  });
});
