import type { ReactNode } from 'react';
import registrarHeaderLogo from '../../../common/assets/Registrar_Header_Logo.png';

type RegistrarHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  showSearch?: boolean;
};

export function RegistrarHeader({ actions, children, showSearch = false }: RegistrarHeaderProps) {
  return (
    <div className="site-chrome registrar-chrome">
      <div className="content-width">
        <header className="kit-header registrar-header">
          <div className="kit-header__utility">
            <span>Department of Education</span>
            <span>Registrar and Learner Information System</span>
          </div>
          <div className="kit-header__main">
            <div className="kit-header__identity">
              <img
                className="kit-header__logo"
                src={registrarHeaderLogo}
                alt="Registrar and Learner Information System header logo"
              />
            </div>
            {showSearch ? (
              <form
                className="kit-header__search"
                role="search"
                onSubmit={(event) => event.preventDefault()}
              >
                <label htmlFor="registrar-search" className="sr-only">
                  Search registrar portal
                </label>
                <input id="registrar-search" type="search" placeholder="Keywords" />
                <button type="submit">Search</button>
              </form>
            ) : actions ? (
              <div className="registrar-header__actions">{actions}</div>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
