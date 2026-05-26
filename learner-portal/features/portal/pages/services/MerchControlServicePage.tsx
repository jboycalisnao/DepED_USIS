import { useEffect, useMemo, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchMerchControlLearnerOrders,
  fetchMerchControlSectionSnapshot,
  type MerchControlSectionGroupRecord,
  type MerchControlSectionLearnerRecord,
} from '../../services/learnerMerchControlService';
import type { LearnerMerchOrderRecord } from '../../services/learnerMerchService';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { MerchControlLearnerTable } from './merch-control/components/MerchControlLearnerTable';
import { MerchControlOrderDetailsModal } from './merch-control/components/MerchControlOrderDetailsModal';

type MerchControlServicePageProps = {
  session: LearnerPortalAccessRecord;
};

export function MerchControlServicePage({ session }: MerchControlServicePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isGradeRepresentative, setIsGradeRepresentative] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('');
  const [rows, setRows] = useState<MerchControlSectionLearnerRecord[]>([]);
  const [sectionGroups, setSectionGroups] = useState<MerchControlSectionGroupRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLearner, setSelectedLearner] = useState<MerchControlSectionLearnerRecord | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<LearnerMerchOrderRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snapshot = await fetchMerchControlSectionSnapshot({
          learnerId: session.learnerId,
          learnerLrn: session.lrn,
        });
        if (cancelled) return;
        setHasAccess(snapshot.hasAccess);
        setIsGradeRepresentative(snapshot.isGradeRepresentative);
        setSectionLabel([snapshot.gradeLevel, snapshot.sectionName].filter(Boolean).join(' - '));
        setRows(snapshot.learners);
        setSectionGroups(snapshot.sectionGroups);
      } catch (nextError: any) {
        if (!cancelled) setError(nextError?.message || 'Unable to load merch control section data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      row.learnerName.toLowerCase().includes(normalizedQuery) ||
      row.learnerLrn.toLowerCase().includes(normalizedQuery) ||
      row.sectionName.toLowerCase().includes(normalizedQuery) ||
      String(row.latestOrderStatus || '').toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, rows]);

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return sectionGroups;
    return sectionGroups
      .map((group) => ({
        ...group,
        learners: group.learners.filter((row) =>
          row.learnerName.toLowerCase().includes(normalizedQuery) ||
          row.learnerLrn.toLowerCase().includes(normalizedQuery) ||
          group.sectionName.toLowerCase().includes(normalizedQuery) ||
          String(row.latestOrderStatus || '').toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.learners.length > 0);
  }, [normalizedQuery, sectionGroups]);

  const openLearnerDetails = async (learner: MerchControlSectionLearnerRecord) => {
    setSelectedLearner(learner);
    setSelectedOrders([]);
    setIsLoadingDetails(true);
    try {
      const orderRows = await fetchMerchControlLearnerOrders({
        learnerId: learner.learnerId,
        learnerLrn: learner.learnerLrn,
      });
      setSelectedOrders(orderRows);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading merch control records..." />;

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Merch Control</h2>
          <p>View class-section learners and inspect merchandise orders per learner.</p>
        </header>
      </div>

      {error ? <p className="learner-services-history__state">{error}</p> : null}
      {!error && !hasAccess ? <p className="learner-services-history__state">No active merch control credential is assigned to this learner account.</p> : null}

      {!error && hasAccess ? (
        <section className="learner-services-history learner-merch-control">
          <header className="learner-services-history__header">
            <h3>Class Section List</h3>
            <p>{sectionLabel || 'Assigned section'} | Click a learner row to view current order list.</p>
          </header>
          <label className="floating-field learner-merch-control__search">
            <div className="floating-field__control">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder=" "
                data-has-value={searchQuery.trim().length > 0 ? 'true' : 'false'}
                aria-label="Search learners in merch control"
              />
              <span>Search learner, LRN, section, or status</span>
            </div>
          </label>
          {rows.length === 0 ? (
            <p className="learner-services-history__state">No learners found in this section.</p>
          ) : isGradeRepresentative ? (
            <div className="learner-merch-control__sections">
              {filteredGroups.length === 0 ? (
                <p className="learner-services-history__state">No learners match your search.</p>
              ) : filteredGroups.map((group, index) => (
                <details key={group.sectionId || index} className="learner-merch-control__section">
                  <summary className="learner-merch-control__section-summary">
                    <span className="learner-merch-control__section-summary-main">
                      <span className="material-symbols-outlined learner-merch-control__section-chevron" aria-hidden="true">
                        chevron_right
                      </span>
                      <span>{group.sectionName}</span>
                    </span>
                    <span>{group.learners.length} learner(s)</span>
                  </summary>
                  <MerchControlLearnerTable
                    ariaLabel={`Learners in ${group.sectionName}`}
                    rows={group.learners}
                    onOpenLearnerDetails={(learner) => void openLearnerDetails(learner)}
                  />
                </details>
              ))}
            </div>
          ) : (
            filteredRows.length === 0 ? <p className="learner-services-history__state">No learners match your search.</p> : (
              <MerchControlLearnerTable
                ariaLabel="Class section learners with merch orders"
                rows={filteredRows}
                onOpenLearnerDetails={(learner) => void openLearnerDetails(learner)}
              />
            )
          )}
        </section>
      ) : null}

      <MerchControlOrderDetailsModal
        learner={selectedLearner}
        orders={selectedOrders}
        isLoadingDetails={isLoadingDetails}
        onClose={() => setSelectedLearner(null)}
      />
    </section>
  );
}
