import type { ReactNode } from 'react';
import { UsisUnifiedHeader } from '../../../common/header/UsisUnifiedHeader';

type RegistrarHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  showSearch?: boolean;
};

export function RegistrarHeader({ actions, children, showSearch = false }: RegistrarHeaderProps) {
  return (
    <div className="site-chrome registrar-chrome">
      <div className="content-width">
        <UsisUnifiedHeader
          searchId="registrar-search"
          searchLabel="Search registrar portal"
          actions={showSearch ? undefined : actions ? <div className="registrar-header__actions">{actions}</div> : null}
        />
        {children}
      </div>
    </div>
  );
}
