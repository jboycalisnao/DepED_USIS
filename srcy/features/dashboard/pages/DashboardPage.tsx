import { useEffect, useMemo, useState } from 'react';
import type { SrcyAccessRecord } from '../../auth/services/srcyAccess';
import { loadSrcyMembers, type SrcyMemberRecord } from '../../members/services/srcyMembershipService';
import rcyEmblem from '../../../../common/assets/RCY Emblem.png';

type DashboardPageProps = {
  session: SrcyAccessRecord;
};

export function DashboardPage({ session }: DashboardPageProps) {
  const [members, setMembers] = useState<SrcyMemberRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadSrcyMembers().then((records) => {
      if (!cancelled) setMembers(records);
    }).catch(() => {
      if (!cancelled) setMembers([]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const active = members.filter((member) => member.membershipStatus === 'Active').length;
    const pending = members.filter((member) => member.membershipStatus === 'Pending').length;
    const inactive = members.filter((member) => member.membershipStatus === 'Inactive').length;
    return { active, inactive, pending, total: members.length };
  }, [members]);

  return (
    <section className="section-shell">
      <div className="page-intro srcy-page-intro">
        <p className="page-intro__eyebrow">Senior Red Cross Youth Council</p>
        <h1>SRCY Hub</h1>
        <p>Membership tracking workspace for SRCY Council operations at {session.schoolName || 'the school'}.</p>
      </div>

      <section className="srcy-identity-panel section-card" aria-label="SRCY Hub summary">
        <div className="section-card__bar" />
        <div className="section-card__content srcy-identity-panel__content">
          <img src={rcyEmblem} alt="Red Cross Youth emblem" />
          <div>
            <h2>Senior Red Cross Youth Council Hub</h2>
            <p>
              Track membership status, council roles, contact details, and registration notes for recognized SRCY
              members.
            </p>
          </div>
        </div>
      </section>

      <section className="srcy-summary-grid" aria-label="Membership summary">
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Total Members</span>
            <strong>{counts.total}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Active</span>
            <strong>{counts.active}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Pending</span>
            <strong>{counts.pending}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Inactive</span>
            <strong>{counts.inactive}</strong>
          </div>
        </article>
      </section>

      <section className="srcy-guidance-grid" aria-label="SRCY operating notes">
        <article className="notice-box">
          <strong>Membership Registry</strong>
          <span>Use learner LRN, grade level, section, and council role for each recorded member.</span>
        </article>
        <article className="notice-box">
          <strong>Status Tracking</strong>
          <span>Keep membership status current for active members, pending applicants, and inactive records.</span>
        </article>
        <article className="notice-box">
          <strong>Coordinator Access</strong>
          <span>SRCY access is controlled through coordinator module assignment in Integrated Admin.</span>
        </article>
      </section>
    </section>
  );
}
