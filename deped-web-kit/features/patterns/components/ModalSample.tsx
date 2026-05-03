type ModalSampleProps = {
  title: string;
  description: string;
  actions: string[];
};

export function ModalSample({ title, description, actions }: ModalSampleProps) {
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-[var(--deped-line)] bg-[#eef3fb] p-5">
      <div className="absolute inset-0 bg-[rgba(18,35,61,0.08)]" />
      <div
        className="relative mx-auto w-full max-w-[560px] rounded-[10px] border border-[var(--deped-line)] bg-white p-5 shadow-[var(--deped-shadow)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--deped-line)] pb-4">
          <h3 className="m-0 font-sans text-[1.2rem] font-bold tracking-[-0.03em] text-deped-ink">
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--deped-line)] bg-white text-[1.2rem] font-bold text-deped-ink"
          >
            x
          </button>
        </div>
        <div className="py-4">
          <p className="m-0 leading-[1.7] text-deped-muted">{description}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--deped-line)] pt-4">
          {actions.map((action, index) => (
            <button
              key={action}
              type="button"
              className={
                index === actions.length - 1
                  ? 'rounded-[10px] bg-deped-blue px-4 py-3 font-bold text-white'
                  : 'rounded-[10px] border border-[var(--deped-line)] bg-white px-4 py-3 font-bold text-deped-ink'
              }
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
