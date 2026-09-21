import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SrcyAccessRecord } from '../../../auth/services/srcyAccess';
import type { SrcyMemberRecord } from '../services/srcyMembershipService';
import {
  getDomRecordStatusSummary,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  fetchOrGetCachedMemberDetails,
  getCachedMemberDetails,
} from '../services/srcyMemberDetailsCache';
import {
  MemberMisDocument,
  type MemberMisHistoryItem,
  type MemberMisTrainingItem,
} from './MemberMisDocument';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import './memberMis.css';

export type MemberMisModalProps = {
  member: SrcyMemberRecord | null;
  onClose: () => void;
  session?: SrcyAccessRecord;
};

export function MemberMisModal({ member, onClose, session }: MemberMisModalProps) {
  const cachedInitial = member ? getCachedMemberDetails(member.id) : null;
  const [allDoms, setAllDoms] = useState<SrcyDomRecord[]>(() => cachedInitial?.allDoms ?? []);
  const [history, setHistory] = useState<SrcyMemberRecord[]>(() => cachedInitial?.history ?? []);
  const [trainings, setTrainings] = useState<MemberMisTrainingItem[]>(() => cachedInitial?.trainings ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedInitial);
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!member) return;

    const cached = getCachedMemberDetails(member.id);
    if (cached) {
      setAllDoms(cached.allDoms);
      setHistory(cached.history);
      setTrainings(cached.trainings || []);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchOrGetCachedMemberDetails(member)
      .then((details) => {
        setAllDoms(details.allDoms);
        setHistory(details.history);
        setTrainings(details.trainings || []);
      })
      .catch(() => {
        setAllDoms([]);
        setHistory([member]);
        setTrainings([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [member]);

  const attachedDom = useMemo(() => {
    if (!member?.domId) return null;
    return allDoms.find((d) => d.id === member.domId) || null;
  }, [member, allDoms]);

  const domHistory = useMemo<MemberMisHistoryItem[]>(() => {
    if (!member) return [];

    // Primary: If member has membershipInfo JSON format, read directly from it!
    if (Array.isArray(member.membershipInfo) && member.membershipInfo.length > 0) {
      return member.membershipInfo.map((term) => {
        const matchingDom = term.domId ? allDoms.find((d) => d.id === term.domId) : null;
        const domNum = term.domNumber || matchingDom?.domNumber || 'DOM Record';
        const sy = term.schoolYear || matchingDom?.schoolYear || '-';
        const vf = term.validFrom || matchingDom?.validFrom || '';
        const vu = term.validUntil || matchingDom?.validUntil || '';
        const status = term.status || (matchingDom ? getDomRecordStatusSummary(matchingDom).status : 'Active');

        return {
          domNumber: domNum,
          schoolYear: sy,
          validFrom: vf,
          validUntil: vu,
          domStatus: status,
        };
      });
    }

    const seenKeys = new Set<string>();
    const items: MemberMisHistoryItem[] = [];

    // Ensure member's current DOM is included first if assigned
    if (member.domId) {
      const curDom = allDoms.find((d) => d.id === member.domId);
      if (curDom) {
        seenKeys.add(curDom.id);
        const summary = getDomRecordStatusSummary(curDom);
        items.push({
          domNumber: curDom.domNumber,
          schoolYear: curDom.schoolYear,
          validFrom: curDom.validFrom,
          validUntil: curDom.validUntil,
          domStatus: summary.status,
        });
      }
    }

    // Process other records in history
    for (const rec of history) {
      const recDom = rec.domId ? allDoms.find((d) => d.id === rec.domId) : null;
      const domKey = recDom?.id || `unassigned-${rec.id}`;
      if (seenKeys.has(domKey)) continue;
      seenKeys.add(domKey);

      if (recDom) {
        const summary = getDomRecordStatusSummary(recDom);
        items.push({
          domNumber: recDom.domNumber,
          schoolYear: recDom.schoolYear,
          validFrom: recDom.validFrom,
          validUntil: recDom.validUntil,
          domStatus: summary.status,
        });
      }
    }

    return items;
  }, [member, allDoms, history]);

  const handlePrint = () => {
    window.print();
  };

  if (!member) return null;

  const generatedBy = session?.fullName || session?.username || 'Authorized Coordinator';

  return createPortal(
    <div className="srcy-mis-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="srcy-mis-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="srcy-mis-modal-header">
          <div className="srcy-mis-modal-header__title">
            <span className="material-symbols-outlined" aria-hidden="true">
              assignment_ind
            </span>
            <span>Member Information Sheet (MIS) Preview &bull; {member.fullName}</span>
          </div>

          <div className="srcy-mis-modal-header__actions">
            <button
              type="button"
              className="primary-button"
              onClick={handlePrint}
              style={{ height: '36px', minHeight: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                print
              </span>
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{ height: '36px', minHeight: '36px', padding: '0 14px', fontSize: '13px' }}
            >
              Close
            </button>
          </div>
        </header>

        <div className="srcy-mis-modal-body">
          {isLoading ? (
            <UsisPageLoader variant="modal" message="Loading member accreditation &amp; training records..." />
          ) : (
            <MemberMisDocument
              ref={printSheetRef}
              member={member}
              attachedDom={attachedDom}
              domHistory={domHistory}
              trainings={trainings}
              generatedBy={generatedBy}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
