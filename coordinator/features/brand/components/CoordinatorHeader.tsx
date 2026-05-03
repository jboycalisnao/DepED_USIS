import coordinatorHeaderLogo from '../../../../common/assets/Coordinator_Portal_Header_Logo.png';

export function CoordinatorHeader() {
  return (
    <header className="kit-header">
      <div className="kit-header__utility">
        <span>Department of Education</span>
        <span>USIS Coordinator Portal</span>
      </div>
      <div className="kit-header__main">
        <div className="kit-header__identity">
          <img
            className="kit-header__logo"
            src={coordinatorHeaderLogo}
            alt="USIS Coordinator Portal header logo"
          />
        </div>
        <form
          className="kit-header__search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="coordinator-search" className="sr-only">
            Search coordinator portal
          </label>
          <input
            id="coordinator-search"
            type="search"
            placeholder="Keywords"
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </header>
  );
}
