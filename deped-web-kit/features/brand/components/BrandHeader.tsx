import webKitHeaderLogo from '../../../../common/assets/Web-Kit_Header_Logo.png';

export function BrandHeader() {
  return (
    <header className="bg-white px-[var(--page-inset)]">
      <div className="flex justify-between gap-4 border-b border-[var(--deped-line)] py-3 text-[0.88rem] text-[#8a8a8a]">
        <span>Department of Education</span>
        <span>DepED System - Web Kit</span>
      </div>
      <div className="flex flex-col items-start justify-between gap-6 border-b-4 border-deped-blue py-6 lg:flex-row lg:items-center">
        <div className="flex items-center">
          <img
            className="h-[50px] w-auto max-w-full object-contain"
            src={webKitHeaderLogo}
            alt="DepED System Web Kit header logo"
          />
        </div>
        <form
          className="flex w-full min-w-[min(100%,420px)] items-stretch gap-[10px] lg:max-w-[500px]"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="kit-search" className="sr-only">
            Search DepED-Web-Kit
          </label>
          <input
            id="kit-search"
            type="search"
            placeholder="Keywords"
            className="min-w-[220px] flex-1 rounded-[4px] border border-[var(--deped-line)] bg-[#f6f6f6] px-[18px] py-3 text-deped-ink outline-none"
          />
          <button
            type="submit"
            className="rounded-[4px] bg-deped-blue px-7 font-bold text-white"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
