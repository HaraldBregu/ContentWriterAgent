import { describe, it, expect } from 'vitest';
import { CONTINUE_MARKER, MARKERS } from '@/marker_writer/markers';

describe('MARKERS', () => {
  it('exports a CONTINUE_MARKER equal to the CONTINUE entry', () => {
    expect(CONTINUE_MARKER).toBe(MARKERS.CONTINUE);
  });

  it('has all expected marker names', () => {
    const names = Object.keys(MARKERS);
    expect(names).toContain('CONTINUE');
    expect(names).toContain('REWRITE_START');
    expect(names).toContain('REWRITE_END');
    expect(names).toContain('ENHANCE_START');
    expect(names).toContain('ENHANCE_END');
    expect(names).toContain('DELETE_START');
    expect(names).toContain('DELETE_END');
    expect(names).toContain('COMMENT');
  });

  it('uses Unicode Private Use Area characters (U+E000–U+F8FF)', () => {
    for (const char of Object.values(MARKERS)) {
      const cp = char.codePointAt(0)!;
      expect(cp).toBeGreaterThanOrEqual(0xe000);
      expect(cp).toBeLessThanOrEqual(0xf8ff);
    }
  });

  it('assigns a unique character to every marker', () => {
    const chars = Object.values(MARKERS);
    const unique = new Set(chars);
    expect(unique.size).toBe(chars.length);
  });

  it('START markers have lower code points than their paired END markers', () => {
    expect(MARKERS.REWRITE_START.codePointAt(0)).toBeLessThan(
      MARKERS.REWRITE_END.codePointAt(0)!,
    );
    expect(MARKERS.ENHANCE_START.codePointAt(0)).toBeLessThan(
      MARKERS.ENHANCE_END.codePointAt(0)!,
    );
    expect(MARKERS.DELETE_START.codePointAt(0)).toBeLessThan(
      MARKERS.DELETE_END.codePointAt(0)!,
    );
  });
});
