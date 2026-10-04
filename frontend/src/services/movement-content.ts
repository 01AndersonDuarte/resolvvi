const MOVEMENT_PREVIEW_LIMIT = 500;

export type MovementContentPreview = {
  preview: string;
  hasMore: boolean;
};

export function getMovementContentPreview(content: string): MovementContentPreview {
  const segments = [...new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(content)];
  const hasMore = segments.length > MOVEMENT_PREVIEW_LIMIT;
  const preview = hasMore
    ? segments.slice(0, MOVEMENT_PREVIEW_LIMIT).map((segment) => segment.segment).join('')
    : content;

  return { preview, hasMore };
}
