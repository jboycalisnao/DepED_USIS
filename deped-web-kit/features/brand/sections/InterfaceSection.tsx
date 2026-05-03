import { SectionShell } from '@/components/ui/SectionShell';
import { CodeSample } from '@/components/ui/CodeSample';
import { GuidanceList } from '../components/GuidanceList';
import { PortalPreview } from '../components/PortalPreview';
import { AlertModalSample } from '@/features/patterns/components/AlertModalSample';
import { GlobalFooterTemplate } from '@/features/patterns/components/GlobalFooterTemplate';
import { ModalSample } from '@/features/patterns/components/ModalSample';

const interfaceGuidance = [
  'Use DepEd Blue for primary headers, navigation, and trusted entry points.',
  'Keep major content surfaces white and reserve DepEd Red for actions that require emphasis.',
  'Favor simple cards, stable spacing, and straightforward forms over decorative treatments.',
  'Design pages so they remain readable and usable on local school networks and lower-spec devices.',
];

const portalPreviewCode = `function FloatingField({
  label,
  type = 'text',
}: {
  label: string;
  type?: string;
}) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input type={type} placeholder=" " />
        <span>{label}</span>
      </div>
    </label>
  );
}

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
        </aside>

        <form className="portal-preview__card">
          <p className="portal-preview__card-kicker">Portal login sample</p>
          <h4>Sign in to continue</h4>
          <FloatingField label="Username" />
          <FloatingField label="Password" type="password" />
          <button type="submit">Access System</button>
        </form>
      </div>
    </div>
  );
}`;

const modalSampleCode = `export function ModalSample() {
  return (
    <div className="modal-demo">
      <div className="modal-demo__backdrop" />
      <div className="modal-demo__dialog" role="dialog" aria-modal="true">
        <div className="modal-demo__header">
          <h3>Confirm learner record update</h3>
          <button type="button">×</button>
        </div>
        <div className="modal-demo__body">
          <p>This action updates the learner profile and audit trail.</p>
        </div>
        <div className="modal-demo__actions">
          <button type="button">Cancel</button>
          <button type="button" className="modal-demo__primary">Confirm</button>
        </div>
      </div>
    </div>
  );
}`;

const alertModalCode = `export function AlertModalSample() {
  return (
    <div className="alert-modal alert-modal--warning">
      <div className="alert-modal__icon">!</div>
      <div className="alert-modal__content">
        <h3>Offline sync required</h3>
        <p>Review pending local changes before reconnecting the device.</p>
      </div>
      <div className="alert-modal__actions">
        <button type="button">Dismiss</button>
        <button type="button" className="alert-modal__primary">Continue</button>
      </div>
    </div>
  );
}`;

const globalFooterCode = `export function GlobalFooterTemplate() {
  return (
    <footer className="border border-[rgba(0,56,168,0.12)] bg-deped-blue text-white">
      <div className="h-8 bg-deped-blue" />
      <div className="flex justify-center bg-white px-6 py-5">
        <img
          src="/assets/usis-footer.png"
          alt="DepED USIS footer logo"
          className="h-[50px] w-auto max-w-full object-contain"
        />
      </div>
      <div className="h-5 bg-deped-yellow" />
      <div className="h-5 bg-deped-red" />
      <div className="grid gap-5 bg-deped-blue px-8 pt-4 pb-1 md:grid-cols-[1.05fr_auto_1.55fr]">
        <section>
          <h3 className="m-0 text-[24px] font-bold uppercase">DepED USIS</h3>
          <p className="mt-4 mb-0 text-[1.02rem] leading-[1.22] text-white">
            Department of Education
            <br />
            Unified School Information System
          </p>
        </section>
        <div className="hidden min-h-[180px] w-px bg-white/90 md:block" />
        <section>
          <h3 className="m-0 text-[24px] font-bold uppercase">Services</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ul className="m-0 grid list-none gap-3 p-0 text-[0.95rem] text-white/92">
              <li>Registrar</li>
              <li>Elections</li>
              <li>Learning records</li>
            </ul>
          </div>
        </section>
      </div>
    </footer>
  );
}`;

export function InterfaceSection() {
  return (
    <SectionShell
      eyebrow="Patterns"
      title="Portal patterns for institutional web pages"
      description="This sample records the common DepEd portal rhythm: clear masthead, direct forms, light surfaces, and restrained emphasis."
    >
      <div className="interface-layout" id="interface">
        <PortalPreview />
        <GuidanceList items={interfaceGuidance} />
      </div>
      <CodeSample title="Portal preview usage" code={portalPreviewCode} />

      <div className="pattern-stack">
        <div className="pattern-showcase">
          <ModalSample
            title="Confirm learner record update"
            description="This action updates the learner profile and writes a new entry to the audit trail."
            actions={['Cancel', 'Confirm']}
          />
          <CodeSample title="Standard modal usage" code={modalSampleCode} />
        </div>

        <div className="pattern-showcase">
          <AlertModalSample
            status="warning"
            title="Offline sync required"
            message="Review pending local changes before reconnecting the device."
          />
          <CodeSample title="Alert modal usage" code={alertModalCode} />
        </div>

        <div className="pattern-showcase">
          <GlobalFooterTemplate />
          <CodeSample title="Global footer usage" code={globalFooterCode} />
        </div>
      </div>
    </SectionShell>
  );
}
