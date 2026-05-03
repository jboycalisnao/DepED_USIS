import usisFooterLogo from '../../../common/assets/USIS_Footer.png';

const serviceColumns = [
  ['Coordinator access', 'School registry', 'Election setup'],
  ['Access codes', 'Coordinator dashboard', 'Migration tools'],
  ['Audit trail', 'Coordinator reports', 'System settings'],
];

export function SiteFooter() {
  return (
    <footer className="site-footer usis-footer">
      <div className="usis-footer__top-band" />
      <div className="usis-footer__logo-band">
        <img src={usisFooterLogo} alt="DepED USIS footer logo" className="usis-footer__logo" />
      </div>
      <div className="usis-footer__yellow-band" />
      <div className="usis-footer__red-band" />

      <div className="usis-footer__body">
        <section>
          <h3>DepED USIS</h3>
          <p className="usis-footer__identity">
            Department of Education
            <br />
            Unified School Information System
          </p>
          <p className="usis-footer__powered">
            A service powered by <strong>Astra Solutions</strong>
          </p>
          <p>
            &copy; {new Date().getFullYear()} - DepED - USIS
          </p>
        </section>

        <div className="usis-footer__divider" />

        <section>
          <h3>Services</h3>
          <div className="usis-footer__services">
            {serviceColumns.map((column, columnIndex) => (
              <ul key={`coordinator-footer-services-${columnIndex}`}>
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
