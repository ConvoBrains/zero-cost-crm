const SITE = 'https://www.convobrains.com'

type Variant = 'compact' | 'panel' | 'lost'

interface ConvobrainsBridgeProps {
  variant?: Variant
  className?: string
}

const COPY: Record<
  Variant,
  { title: string; body: string; cta: string }
> = {
  compact: {
    title: 'What vs Why',
    body: 'Zero Cost CRM tracks what happened. ConvoBrains explains why the call won or lost.',
    cta: 'Explore ConvoBrains',
  },
  panel: {
    title: 'You have the recording. Want the why?',
    body: 'Upload stores the call. ConvoBrains can score pitch, objections, talk ratio and budget signals.',
    cta: 'Analyze conversations',
  },
  lost: {
    title: 'Closed Lost shows where the deal died',
    body: 'Connect ConvoBrains to learn why — missed objections, weak discovery, or talk-over patterns.',
    cta: 'See conversation intelligence',
  },
}

export function ConvobrainsBridge({
  variant = 'compact',
  className = '',
}: ConvobrainsBridgeProps) {
  const copy = COPY[variant]
  return (
    <aside
      className={`rounded-none border border-[var(--color-line)] bg-stone-50 p-4 ${className}`}
    >
      <p className="text-[11px] font-semibold tracking-[0.12em] text-stone-500 uppercase">
        Conversation intelligence
      </p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">{copy.body}</p>
      <a
        href={SITE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex text-xs font-semibold text-teal-800 underline-offset-2 hover:underline"
      >
        {copy.cta}
      </a>
    </aside>
  )
}
