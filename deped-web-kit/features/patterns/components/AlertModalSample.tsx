type AlertModalSampleProps = {
  status: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
};

export function AlertModalSample({
  status,
  title,
  message,
}: AlertModalSampleProps) {
  const statusClass =
    status === 'success'
      ? 'border-[#2f855a] bg-[#edf9f1] text-[#1f6b45]'
      : status === 'warning'
        ? 'border-[#b7791f] bg-[#fff8e8] text-[#8c5e16]'
        : 'border-deped-red bg-[#fff1f3] text-[#9b1323]';

  const statusIcon = status === 'success' ? 'OK' : status === 'warning' ? '!' : 'x';

  return (
    <div className="rounded-[10px] border border-[var(--deped-line)] bg-white p-5 shadow-[var(--deped-shadow)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border text-[1rem] font-bold',
              statusClass,
            ].join(' ')}
            aria-hidden="true"
          >
            {statusIcon}
          </div>
          <div className="max-w-[520px]">
            <h3 className="m-0 font-sans text-[1.15rem] font-bold tracking-[-0.03em] text-deped-ink">
              {title}
            </h3>
            <p className="mt-2 mb-0 leading-[1.7] text-deped-muted">{message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <button
            type="button"
            className="rounded-[10px] border border-[var(--deped-line)] bg-white px-4 py-3 font-bold text-deped-ink"
          >
            Dismiss
          </button>
          <button
            type="button"
            className="rounded-[10px] bg-deped-blue px-4 py-3 font-bold text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
