import usisFooterLogo from '../../../../common/assets/USIS_Footer.png';

const serviceColumns = [
  ['Registrar', 'Elections', 'Learning records'],
  ['User access', 'School settings', 'Reports'],
  ['Help desk', 'Privacy notice', 'System status'],
];

export function GlobalFooterTemplate() {
  return (
    <footer className="border border-[rgba(0,56,168,0.12)] bg-deped-blue text-white">
      <div className="h-8 bg-deped-blue" />
      <div className="flex justify-center bg-white px-6 py-5">
        <img
          src={usisFooterLogo}
          alt="DepED USIS footer logo"
          className="h-[50px] w-auto max-w-full object-contain"
        />
      </div>
      <div className="h-5 bg-deped-yellow" />
      <div className="h-5 bg-deped-red" />

      <div className="grid gap-5 bg-deped-blue px-8 pt-4 pb-1 text-white md:grid-cols-[1.05fr_auto_1.55fr] md:items-start">
        <section>
          <h3 className="m-0 text-[24px] leading-none font-bold uppercase tracking-[-0.03em]">
            DepED USIS
          </h3>
          <p className="mt-4 mb-0 text-[1.02rem] leading-[1.22] text-white">
            Department of Education
            <br />
            Unified School Information System
          </p>
          <p className="mt-5 mb-0 text-[0.92rem] leading-[1.4] text-white/92 italic">
            A service powered by <strong>Astra Solutions</strong>
          </p>
          <p className="mt-1 mb-0 text-[0.92rem] leading-[1.4] text-white/92">
            &copy; 2026 - DepED - USIS
          </p>
        </section>

        <div className="hidden h-full min-h-[180px] w-px bg-white/90 md:block" />

        <section>
          <h3 className="m-0 text-[24px] leading-none font-bold uppercase tracking-[-0.03em]">
            Services
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceColumns.map((column, columnIndex) => (
              <ul
                key={`footer-services-${columnIndex}`}
                className="m-0 grid list-none gap-3 p-0 text-[0.95rem] leading-[1.28] text-white/92"
              >
                {column.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ))}
          </div>
        </section>
      </div>
    </footer>
  );
}
