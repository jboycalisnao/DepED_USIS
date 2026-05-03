import { FloatingField } from './FloatingField';

export function PortalFormShowcase() {
  return (
    <div className="portal-catalog">
      <aside className="portal-catalog__info">
        <p className="catalog-panel__eyebrow">DepEd login and transaction style</p>
        <h3>Use floating labels for text-heavy clerical workflows.</h3>
        <p>
          This pattern works well for sign-in screens, registrar intake forms,
          election admin access, and request portals where labels should stay
          visible after entry.
        </p>
      </aside>

      <form className="portal-catalog__form">
        <FloatingField label="Username" defaultValue="registrar.staff" />
        <FloatingField
          label="Password"
          type="password"
          defaultValue="temporary-password"
        />
        <button type="button">Sign in</button>
      </form>
    </div>
  );
}
