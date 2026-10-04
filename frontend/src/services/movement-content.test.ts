import { describe, expect, it } from 'vitest';
import { getMovementContentPreview } from './movement-content';

describe('getMovementContentPreview', () => {
  it('keeps content of 500 graphemes complete', () => {
    const content = 'á'.repeat(500);

    expect(getMovementContentPreview(content)).toEqual({ preview: content, hasMore: false });
  });

  it('cuts after 500 graphemes without splitting emoji or combined accents', () => {
    const content = `${'👩🏽‍⚖️'.repeat(500)}e\u0301`;

    expect(getMovementContentPreview(content)).toEqual({ preview: '👩🏽‍⚖️'.repeat(500), hasMore: true });
  });

  it('retains the complete maximum source content for expansion', () => {
    const content = 'ação jurídica\n'.repeat(1090) + 'fim123';

    expect(getMovementContentPreview(content).hasMore).toBe(true);
    expect(content.length).toBe(15_266);
  });
});
