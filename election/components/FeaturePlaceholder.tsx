import React from 'react';

interface FeaturePlaceholderProps {
  title: string;
  label: string;
  message: string;
}

const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({ title, label, message }) => {
  return (
    <section className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10">
      <div className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <h1 className="mt-2 text-[24px] font-black uppercase text-[#034F8B]">{title}</h1>
        </div>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-slate-100">
            <i className="fa-solid fa-clock text-[20px] text-[#034F8B]"></i>
          </div>
          <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-[1.5] text-slate-600">
            {message}
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturePlaceholder;
