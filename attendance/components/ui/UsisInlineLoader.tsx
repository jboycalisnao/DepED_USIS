type UsisInlineLoaderProps = {
  message?: string;
};

export default function UsisInlineLoader({ message = 'Loading learners...' }: UsisInlineLoaderProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-md border border-[#d6deeb] bg-white px-6 py-10 text-center" role="status" aria-live="polite" aria-label={message}>
      <div className="relative grid h-[148px] w-[148px] place-items-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-[#0038a8] border-r-[#0038a8] animate-spin" />
        <span className="absolute inset-[10px] rounded-full border-[5px] border-transparent border-t-[#ce1126] border-r-[#ce1126] animate-spin [animation-direction:reverse] [animation-duration:1.8s]" />
        <span className="absolute inset-[20px] rounded-full border-[5px] border-transparent border-t-[#f1c40f] border-r-[#f1c40f] animate-spin [animation-duration:1.4s]" />
        <span className="relative grid h-[74px] w-[74px] place-items-center rounded-full border border-[#d6deeb] bg-white shadow-[0_4px_10px_rgba(18,35,61,0.1)]">
          <span className="material-symbols-outlined text-[34px] leading-none text-[#0038a8]">school</span>
        </span>
      </div>
      <p className="text-[13px] font-semibold text-[#243a60]">{message}</p>
    </div>
  );
}
