import React from 'react';
import usisFooterLogo from '../../common/assets/USIS_Footer.png';

interface FooterProps {
  schoolYearLabel?: string;
}

const serviceColumns = [
  ['Voter access', 'Candidate lineup', 'Public results'],
  ['Public turnout', 'Admin dashboard', 'Live tally'],
  ['Audit trail', 'Election reports', 'System settings'],
];

const Footer: React.FC<FooterProps> = ({ schoolYearLabel }) => {
  return (
    <footer className="flex-shrink-0 border border-[rgba(0,56,168,0.12)] bg-[#0038a8] text-white no-print">
      <div className="h-4 bg-[#0038a8]" />
      <div className="flex justify-center bg-white px-6 py-2.5">
        <img
          src={usisFooterLogo}
          alt="DepED USIS footer logo"
          className="h-[50px] w-auto max-w-full object-contain"
        />
      </div>
      <div className="h-3 bg-[#fcd116]" />
      <div className="h-3 bg-[#ce1126]" />

      <div className="grid gap-4 bg-[#0038a8] px-7 pt-3 pb-1 text-white md:grid-cols-[1.05fr_auto_1.55fr] md:items-start">
        <section>
          <h3 className="m-0 text-[24px] leading-none font-bold uppercase tracking-[-0.03em]">
            DepED USIS
          </h3>
          <p className="mt-3 mb-0 text-[16px] leading-[1.2] text-white">
            Department of Education
            <br />
            Unified School Information System
          </p>
          <p className="mt-5 mb-0 text-[13px] leading-[1.4] text-white/92 italic">
            A service powered by <strong>Astra Solutions</strong>
          </p>
          <p className="mt-1 mb-0 text-[13px] leading-[1.4] text-white/92">
            &copy; {new Date().getFullYear()} - DepED - USIS
          </p>
        </section>

        <div className="hidden h-full min-h-[120px] w-px bg-white/90 md:block" />

        <section>
          <h3 className="m-0 text-[24px] leading-none font-bold uppercase tracking-[-0.03em]">
            Services
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serviceColumns.map((column, columnIndex) => (
              <ul
                key={`election-footer-services-${columnIndex}`}
                className="m-0 grid list-none gap-2 p-0 text-[13px] leading-[1.22] text-white/92"
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
};

export default Footer;
