import React from 'react';
import learnerGovernmentHeaderLogo from '../../common/assets/Learner-Government_Header_Logo.png';
import { navigateToElectionPath } from '../utils/navigation';

interface HeaderProps {
  onLogout?: () => void;
  currentUser?: string | null;
  onAdminClick?: () => void;
  schoolName?: string;
  electionYear?: string;
  currentView?: string;
}

type NavItem = {
  label: string;
  href: string;
  isActive: (view: string) => boolean;
};

const publicNavItems: NavItem[] = [
  {
    label: 'Voting',
    href: '/',
    isActive: (view) =>
      ['login', 'identity-confirmation', 'ballot', 'confirmation'].includes(view),
  },
  {
    label: 'Election Registration',
    href: '/election-registration',
    isActive: (view) => view === 'election-registration',
  },
  {
    label: 'Results',
    href: '/results',
    isActive: (view) => view === 'results-page',
  },
];

const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    isActive: (view) => view === 'admin',
  },
  {
    label: 'Monitoring',
    href: '/monitoring',
    isActive: (view) => view === 'monitoring',
  },
  ...publicNavItems,
];

const searchTargets = [
  { keywords: ['voter', 'vote', 'ballot', 'login', 'access'], href: '/' },
  { keywords: ['registration', 'register', 'coordinator', 'election registration'], href: '/election-registration' },
  { keywords: ['results', 'result', 'winner', 'winners'], href: '/results' },
  { keywords: ['turnout', 'participation'], href: '/public-turnout' },
  { keywords: ['admin', 'administrator', 'dashboard'], href: '/admin-access' },
  { keywords: ['monitoring', 'live tally', 'tally'], href: '/monitoring' },
];

const Header: React.FC<HeaderProps> = ({
  onLogout,
  currentUser,
  onAdminClick,
  schoolName,
  electionYear,
  currentView = 'login',
}) => {
  const isAdmin = currentUser === 'System Administrator';
  const navItems = isAdmin ? adminNavItems : publicNavItems;
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleAdminIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAdminClick) onAdminClick();
  };

  const navigateToHashRoute = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigateToElectionPath(href);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return;

    const matchedTarget = searchTargets.find((target) =>
      target.keywords.some((keyword) => normalizedQuery.includes(keyword)),
    );

    if (matchedTarget) {
      navigateToElectionPath(matchedTarget.href);
      return;
    }

    const fallbackTarget = isAdmin ? '/admin/dashboard' : '/';
    navigateToElectionPath(fallbackTarget);
  };

  return (
    <header className="w-full bg-white shadow-[0_2px_0_rgba(18,35,61,0.04)]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <div className="px-[28px]">
          <div className="flex justify-between gap-4 border-b border-[rgba(18,35,61,0.12)] py-3 text-[0.88rem] text-[#8a8a8a]">
            <span>Department of Education</span>
            <span>Learner Government Election Portal</span>
          </div>

          <div className="flex flex-col items-start justify-between gap-6 border-b-4 border-[#0038a8] py-6 lg:flex-row lg:items-center">
            <div className="flex items-center">
              <img
                className="h-[50px] w-auto max-w-full object-contain"
                src={learnerGovernmentHeaderLogo}
                alt="Learner Government election portal header logo"
              />
            </div>

            <form
              className="flex w-full min-w-[min(100%,420px)] items-stretch gap-[10px] lg:max-w-[500px]"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <label htmlFor="election-search" className="sr-only">
                Search election portal
              </label>
              <input
                id="election-search"
                type="search"
                placeholder="Keywords"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-w-[220px] flex-1 rounded-[4px] border border-[rgba(18,35,61,0.12)] bg-[#f6f6f6] px-[18px] py-3 text-[#12233d] outline-none"
              />
              <button
                type="submit"
                className="rounded-[4px] bg-[#0038a8] px-7 font-bold text-white transition-colors hover:bg-[#002f8a]"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        <nav className="border-b border-[rgba(18,35,61,0.12)] px-[28px]" aria-label="Election portal sections">
          <div className="flex flex-wrap items-center gap-5 py-5 md:gap-10 lg:gap-16">
            {navItems.map((item) => {
              const isActive = item.isActive(currentView);

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => navigateToHashRoute(e, item.href)}
                  className={[
                    'inline-flex items-center text-[0.98rem] font-bold tracking-[0.02em] uppercase transition-colors',
                    isActive ? 'text-[#0038a8]' : 'text-[#8a8a8a] hover:text-[#0038a8]',
                  ].join(' ')}
                >
                  <strong>{item.label}</strong>
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
