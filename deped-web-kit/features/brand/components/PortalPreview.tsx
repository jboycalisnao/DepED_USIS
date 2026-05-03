import { FloatingField } from '@/features/forms/components/FloatingField';

export function PortalPreview() {
  return (
    <div className="portal-preview">
      <div className="portal-preview__masthead">
        <div>
          <p className="portal-preview__kicker">Unified Information Services</p>
          <h3>DepEd Access Portal</h3>
        </div>
        <button type="button">Need Help?</button>
      </div>

      <div className="portal-preview__body">
        <aside className="portal-preview__rail">
          <p className="portal-preview__rail-title">Public Service</p>
          <h4>Simple, familiar, and official.</h4>
          <p>
            The LIS-inspired direction favors a calm white surface, a stable
            blue frame, and restrained red emphasis for action points.
          </p>
        </aside>

        <form className="portal-preview__card">
          <p className="portal-preview__card-kicker">Portal login sample</p>
          <h4>Sign in to continue</h4>
          <FloatingField label="Username" defaultValue="division.user" />
          <FloatingField
            label="Password"
            type="password"
            defaultValue="secure-password"
          />
          <button type="submit">Access System</button>
        </form>
      </div>
    </div>
  );
}
