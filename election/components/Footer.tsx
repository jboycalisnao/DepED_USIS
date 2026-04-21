
import React from 'react';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL, CURRENT_SY_LABEL } from '../constants';

interface FooterProps {
  schoolYearLabel?: string;
}

const Footer: React.FC<FooterProps> = ({ schoolYearLabel }) => {
  return (
    <footer className="bg-[#0b1424] text-[#4b5563] py-4 border-t border-gray-800 flex-shrink-0 relative z-10 no-print">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex justify-center space-x-6 mb-3 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
           <img src={DEPED_SEAL_URL} className="h-6 w-auto" alt="DepEd" />
           <img src={LEON_NHS_LOGO_URL} className="h-6 w-auto" alt="LNHS" />
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-[#5e718d]">
          © {new Date().getFullYear()} DEPARTMENT OF EDUCATION PHILIPPINES • LG E-BOTO SY {schoolYearLabel || CURRENT_SY_LABEL}
        </p>
        <p className="text-[7px] uppercase tracking-[0.1em] text-[#344054] mt-1">
          Leon National High School Official Election Portal
        </p>
      </div>
    </footer>
  );
};

export default Footer;
