import { useState } from 'react';
import { getMovementContentPreview } from '../services/movement-content';
import type { Movement } from '../types/movement';

type MovementItemProps = { movement: Movement };

export function MovementItem({ movement }: MovementItemProps) {
  const [expanded, setExpanded] = useState(false);
  const content = movement.movementContent;
  const preview = content === null ? null : getMovementContentPreview(content);

  return <article className="grid min-w-0 gap-3 border-l-2 border-route/30 pl-4 sm:pl-5">
    <p className="text-sm font-semibold text-route">{movement.movementDate ?? 'Data não informada'}</p>
    <h3 className="break-words text-base font-semibold text-ink">{movement.movementTitle ?? 'Título não informado'}</h3>
    <MovementBody content={content} preview={preview?.preview ?? null} hasMore={preview?.hasMore ?? false} expanded={expanded} onToggle={() => setExpanded((current) => !current)} />
  </article>;
}

function MovementBody({ content, preview, hasMore, expanded, onToggle }: {
  content: string | null;
  preview: string | null;
  hasMore: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (content === null || content.length === 0) return <p className="text-sm text-muted-ink">Conteúdo não informado</p>;

  return <div className="grid justify-items-start gap-2">
    <p className="break-words whitespace-pre-wrap text-sm leading-6 text-ink">{expanded ? content : preview}</p>
    {hasMore ? <button type="button" aria-expanded={expanded} onClick={onToggle} className="min-h-10 rounded-md px-2 text-sm font-semibold text-route underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30">{expanded ? 'Recolher' : 'Ver conteúdo completo'}</button> : null}
  </div>;
}
