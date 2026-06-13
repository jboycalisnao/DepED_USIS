import React from 'react';
import { UsisUnifiedHeader } from '../../common/header/UsisUnifiedHeader';
import { navigateToElectionPath } from '../utils/navigation';

interface HeaderProps {
  currentUser?: string | null;
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
  { keywords: ['monitoring', 'live tally', 'tally'], href: '/monitoring' },
];

const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView = 'login',
}) => {
  const isAdmin = currentUser === 'System Administrator';
  const navItems = isAdmin ? adminNavItems : publicNavItems;
  const [searchQuery, setSearchQuery] = React.useState('');

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
      <div className="w-full">
        <UsisUnifiedHeader
          searchId="election-search"
          searchLabel="Search election portal"
          onSearchSubmit={handleSearchSubmit}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {currentView !== 'admin' && (
          <nav className="border-b border-[rgba(18,35,61,0.12)] px-[var(--page-inset)]" aria-label="Election portal sections">
            <div className="flex flex-wrap items-center gap-5 py-5 md:gap-10 lg:gap-16">
              {navItems.map((item) => {
                const isActive = item.isActive(currentView);

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => navigateToHashRoute(e, item.href)}
                    className={[
                      'election-header-nav__link inline-flex items-center text-[0.98rem] uppercase transition-colors',
                      isActive ? 'election-header-nav__link--active' : '',
                      isActive ? 'text-[#0038a8]' : 'text-[#8a8a8a] hover:text-[#0038a8]',
                    ].join(' ')}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
