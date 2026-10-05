type SummaryContentProps = { paragraphs: string[] };

export function SummaryContent({ paragraphs }: SummaryContentProps) {
  return <div className="grid gap-3 text-base leading-7 text-ink">
    {paragraphs.map((paragraph, index) => <p key={`${index}:${paragraph}`}>{paragraph}</p>)}
  </div>;
}
