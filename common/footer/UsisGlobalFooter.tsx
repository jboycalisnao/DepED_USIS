export function UsisGlobalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer usis-global-footer">
      <div className="usis-global-footer__blue">
        <p>&copy; {year} Leon NHS - Leon, Iloilo - School Information System Dev Team</p>
      </div>
      <div className="usis-global-footer__white" />
      <div className="usis-global-footer__yellow" />
      <div className="usis-global-footer__red" />
    </footer>
  );
}
