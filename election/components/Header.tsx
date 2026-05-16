import React from 'react';
import { UsisUnifiedHeader } from '../../common/header/UsisUnifiedHeader';
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
        <UsisUnifiedHeader
          searchId="election-search"
          searchLabel="Search election portal"
          onSearchSubmit={handleSearchSubmit}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

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
