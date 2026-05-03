import { useMemo, useState } from 'react';

type CodeSampleTab = {
  label: string;
  code: string;
  language?: string;
};

type CodeSampleProps =
  | {
      title: string;
      code: string;
      language?: string;
      tabs?: never;
    }
  | {
      title: string;
      tabs: CodeSampleTab[];
      code?: never;
      language?: never;
    };

export function CodeSample(props: CodeSampleProps) {
  const tabs = useMemo<CodeSampleTab[]>(
    () =>
      'tabs' in props
        ? props.tabs
        : [{ label: 'Code', code: props.code, language: props.language ?? 'tsx' }],
    [props],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const activeTab = tabs[activeIndex] ?? tabs[0];
  const tabListId = `${props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tabs`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeTab.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className="mt-[18px] overflow-hidden rounded-[10px] border border-[#24324d] bg-[#0f1728]"
      aria-label={props.title}
    >
      <div className="border-b border-white/8 bg-[#162136] px-4 py-[14px]">
        <div className="flex items-center gap-4">
          <div className="inline-flex gap-2">
            <span className="h-[10px] w-[10px] rounded-full bg-[#ff5f57]" />
            <span className="h-[10px] w-[10px] rounded-full bg-[#febc2e]" />
            <span className="h-[10px] w-[10px] rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-3">
            <h3 className="m-0 text-[0.98rem] font-semibold text-[#f8fafc]">
              {props.title}
            </h3>
            <span className="text-[0.82rem] tracking-[0.12em] text-[#94a3b8] uppercase">
              {activeTab.language ?? 'tsx'}
            </span>
          </div>
          <button
            type="button"
            className="rounded-[10px] border border-white/12 bg-[#1f2c45] px-3 py-2 font-bold text-[#f8fafc] hover:bg-[#2a3a59]"
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {tabs.length > 1 ? (
          <div
            id={tabListId}
            role="tablist"
            aria-label={`${props.title} code navigation`}
            className="mt-4 flex flex-wrap gap-2"
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tabListId}-panel-${index}`}
                  id={`${tabListId}-tab-${index}`}
                  tabIndex={isActive ? 0 : -1}
                  className={
                    isActive
                      ? 'rounded-[10px] border border-[#5e78b8] bg-[#22314f] px-3 py-2 text-[14px] font-bold text-white'
                      : 'rounded-[10px] border border-white/10 bg-[#101a2d] px-3 py-2 text-[14px] font-bold text-[#9fb3d9] hover:border-[#3c517d] hover:bg-[#1a2740] hover:text-white'
                  }
                  onClick={() => setActiveIndex(index)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <pre
        className="m-0 overflow-x-auto bg-[#0f1728] px-5 pt-[18px] pb-5"
        role="tabpanel"
        id={`${tabListId}-panel-${activeIndex}`}
        aria-labelledby={`${tabListId}-tab-${activeIndex}`}
      >
        <code className="font-mono text-[0.92rem] leading-[1.7] text-[#dbe7ff]">
          {activeTab.code}
        </code>
      </pre>
    </section>
  );
}
