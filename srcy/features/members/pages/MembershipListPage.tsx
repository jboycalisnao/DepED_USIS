import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SrcyAccessRecord } from '../../auth/services/srcyAccess';
import {
  deleteSrcyMember,
  loadSrcyMembers,
  updateSrcyMemberStatus,
  type SrcyMemberRecord,
  type SrcyMembershipStatus,
} from '../services/srcyMembershipService';
import {
  computeMemberStatusFromDom,
  getMemberDomValiditySummary,
  loadSrcyDomRecords,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';
import { MemberDetailsModal } from '../modals/MemberDetailsModal';
import { MemberEditModal } from '../modals/MemberEditModal';
import { MemberRenewModal } from '../modals/MemberRenewModal';
import { MemberMisModal } from '../mis/MemberMisModal';
import { invalidateMemberDetailsCache } from '../services/srcyMemberDetailsCache';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';

type MembershipListPageProps = {
  session: SrcyAccessRecord;
};

const statusOptions: SrcyMembershipStatus[] = ['Active', 'Pending', 'Inactive'];

const statusFilterOptions: UsisSearchableSelectOption[] = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Inactive', value: 'Inactive' },
];

type GroupByOption = 'none' | 'dateAdded' | 'dom' | 'gradeLevel' | 'status' | 'role';

const groupByOptions: UsisSearchableSelectOption[] = [
  { label: 'None (Standard List)', value: 'none' },
  { label: 'Date Added (Month & Year)', value: 'dateAdded' },
  { label: 'DOM Batch', value: 'dom' },
  { label: 'Grade Level', value: 'gradeLevel' },
  { label: 'Membership Status', value: 'status' },
  { label: 'Council Role', value: 'role' },
];

const getStatusClassName = (status: SrcyMembershipStatus) =>
  `srcy-status-chip srcy-status-chip--${status.toLowerCase()}`;

export function MembershipListPage({ session }: MembershipListPageProps) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<SrcyMemberRecord[]>([]);
  const [domBatches, setDomBatches] = useState<SrcyDomRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);

  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<SrcyMemberRecord | null>(null);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<SrcyMemberRecord | null>(null);
  const [selectedMemberForMis, setSelectedMemberForMis] = useState<SrcyMemberRecord | null>(null);
  const [renewingMember, setRenewingMember] = useState<SrcyMemberRecord | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<SrcyMemberRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [membersData, domsData] = await Promise.all([
        loadSrcyMembers(),
        loadSrcyDomRecords().catch(() => []),
      ]);
      setMembers(membersData);
      setDomBatches(domsData);
    } catch (error: any) {
      setAlert({ title: 'Membership Load Failed', message: error?.message || 'Unable to load SRCY members.', tone: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const domMap = useMemo(() => {
    const map = new Map<string, SrcyDomRecord>();
    domBatches.forEach((d) => map.set(d.id, d));
    return map;
  }, [domBatches]);

  // Group members by learner LRN so each learner shows their current/latest active term
  const { distinctMembers, memberTermCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((m) => {
      const key = m.learnerLrn?.trim() || m.id;
      const jsonTermsCount = Array.isArray(m.membershipInfo) ? m.membershipInfo.length : 0;
      if (jsonTermsCount > 0) {
        counts.set(key, jsonTermsCount);
      } else {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    // Sort latest first
    const sorted = [...members].sort((a, b) => {
      const timeA = new Date(a.joinedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.joinedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const map = new Map<string, SrcyMemberRecord>();
    for (const m of sorted) {
      const key = m.learnerLrn?.trim() || m.id;
      if (!map.has(key)) {
        map.set(key, m);
      }
    }

    return {
      distinctMembers: Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName)),
      memberTermCounts: counts,
    };
  }, [members]);

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let inactive = 0;
    distinctMembers.forEach((m) => {
      const dom = m.domId ? domMap.get(m.domId) : null;
      const status = computeMemberStatusFromDom(dom);
      if (status === 'Active') active++;
      else if (status === 'Pending') pending++;
      else inactive++;
    });
    return { total: distinctMembers.length, active, pending, inactive };
  }, [distinctMembers, domMap]);

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return distinctMembers.filter((member) => {
      const dom = member.domId ? domMap.get(member.domId) : null;
      const effectiveStatus = computeMemberStatusFromDom(dom);
      const matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
      if (!matchesStatus) return false;
      if (!needle) return true;
      return [
        member.fullName,
        member.learnerLrn,
        member.gradeLevel,
        member.section,
        member.councilRole,
        member.maabId,
        effectiveStatus,
        dom?.domNumber,
        dom?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [distinctMembers, search, statusFilter, domMap]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  const collapseAll = () => {
    const allKeys = new Set(groupedMembers.map((g) => g.key));
    setCollapsedGroups(allKeys);
  };

  const groupedMembers = useMemo<{
    key: string;
    label: string;
    icon?: string;
    subtitle?: string;
    members: SrcyMemberRecord[];
  }[]>(() => {
    if (groupBy === 'none') {
      return [];
    }

    if (groupBy === 'dateAdded') {
      const map = new Map<string, { label: string; dateSortKey: string; members: SrcyMemberRecord[] }>();
      for (const m of filteredMembers) {
        const rawDate = m.joinedAt || m.createdAt;
        let groupKey = 'unspecified';
        let groupLabel = 'Unspecified Date';
        let dateSortKey = '0000-00';

        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            groupKey = `${year}-${month}`;
            dateSortKey = groupKey;
            groupLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
        }

        if (!map.has(groupKey)) {
          map.set(groupKey, { label: groupLabel, dateSortKey, members: [] });
        }
        map.get(groupKey)!.members.push(m);
      }

      const sortedKeys = Array.from(map.keys()).sort((a, b) => {
        if (a === 'unspecified') return 1;
        if (b === 'unspecified') return -1;
        return b.localeCompare(a); // Newest month/year first
      });

      return sortedKeys.map((key) => {
        const item = map.get(key)!;
        return {
          key,
          label: item.label,
          icon: 'calendar_month',
          members: item.members,
        };
      });
    }

    if (groupBy === 'dom') {
      const map = new Map<string, { label: string; subtitle?: string; sortOrder: number; members: SrcyMemberRecord[] }>();
      for (const m of filteredMembers) {
        const dom = m.domId ? domMap.get(m.domId) : null;
        let groupKey = 'unassigned';
        let groupLabel = 'Unassigned / No DOM';
        let groupSubtitle = 'Members not attached to any DOM batch';
        let sortOrder = 999;

        if (dom) {
          groupKey = dom.id;
          const sy = dom.schoolYear ? (dom.schoolYear.startsWith('S.Y.') ? dom.schoolYear : `S.Y. ${dom.schoolYear}`) : '';
          groupLabel = sy ? `${dom.domNumber} (${sy}) - ${dom.title}` : `${dom.domNumber} - ${dom.title}`;
          groupSubtitle = `Validity: ${dom.validFrom} to ${dom.validUntil} • Status: ${dom.status}`;
          if (dom.status === 'Active') sortOrder = 1;
          else if (dom.status === 'Pending') sortOrder = 2;
          else if (dom.status === 'Expired') sortOrder = 3;
          else sortOrder = 4;
        }

        if (!map.has(groupKey)) {
          map.set(groupKey, { label: groupLabel, subtitle: groupSubtitle, sortOrder, members: [] });
        }
        map.get(groupKey)!.members.push(m);
      }

      const sortedKeys = Array.from(map.keys()).sort((a, b) => {
        const itemA = map.get(a)!;
        const itemB = map.get(b)!;
        if (itemA.sortOrder !== itemB.sortOrder) return itemA.sortOrder - itemB.sortOrder;
        return itemA.label.localeCompare(itemB.label);
      });

      return sortedKeys.map((key) => {
        const item = map.get(key)!;
        return {
          key,
          label: item.label,
          subtitle: item.subtitle,
          icon: 'assignment',
          members: item.members,
        };
      });
    }

    if (groupBy === 'gradeLevel') {
      const map = new Map<string, { label: string; gradeNum: number; members: SrcyMemberRecord[] }>();
      for (const m of filteredMembers) {
        const gl = (m.gradeLevel || '').trim();
        const groupKey = gl ? gl.toLowerCase() : 'unspecified';
        const groupLabel = gl ? (gl.toLowerCase().startsWith('grade') ? gl : `Grade ${gl}`) : 'Unspecified Grade';
        const match = gl.match(/\d+/);
        const gradeNum = match ? parseInt(match[0], 10) : 999;

        if (!map.has(groupKey)) {
          map.set(groupKey, { label: groupLabel, gradeNum, members: [] });
        }
        map.get(groupKey)!.members.push(m);
      }

      const sortedKeys = Array.from(map.keys()).sort((a, b) => {
        const itemA = map.get(a)!;
        const itemB = map.get(b)!;
        if (itemA.gradeNum !== itemB.gradeNum) return itemA.gradeNum - itemB.gradeNum;
        return itemA.label.localeCompare(itemB.label);
      });

      return sortedKeys.map((key) => {
        const item = map.get(key)!;
        return {
          key,
          label: item.label,
          icon: 'school',
          members: item.members,
        };
      });
    }

    if (groupBy === 'status') {
      const map = new Map<string, { label: string; sortOrder: number; members: SrcyMemberRecord[] }>();
      map.set('Active', { label: 'Active Members', sortOrder: 1, members: [] });
      map.set('Pending', { label: 'Pending Members', sortOrder: 2, members: [] });
      map.set('Inactive', { label: 'Inactive Members', sortOrder: 3, members: [] });

      for (const m of filteredMembers) {
        const dom = m.domId ? domMap.get(m.domId) : null;
        const status = computeMemberStatusFromDom(dom);
        if (map.has(status)) {
          map.get(status)!.members.push(m);
        } else {
          map.get('Inactive')!.members.push(m);
        }
      }

      return Array.from(map.entries())
        .filter(([_, item]) => item.members.length > 0)
        .map(([key, item]) => ({
          key,
          label: item.label,
          icon: key === 'Active' ? 'check_circle' : key === 'Pending' ? 'schedule' : 'cancel',
          members: item.members,
        }));
    }

    if (groupBy === 'role') {
      const map = new Map<string, { label: string; sortOrder: number; members: SrcyMemberRecord[] }>();
      const roleRank: Record<string, number> = {
        president: 1,
        'vice president': 2,
        secretary: 3,
        'assistant secretary': 4,
        treasurer: 5,
        'assistant treasurer': 6,
        auditor: 7,
        'public information officer': 8,
        pio: 8,
        'peace officer': 9,
        'council member': 20,
        member: 21,
      };

      for (const m of filteredMembers) {
        const role = (m.councilRole || 'Member').trim();
        const groupKey = role.toLowerCase();
        const sortOrder = roleRank[groupKey] ?? 50;

        if (!map.has(groupKey)) {
          map.set(groupKey, { label: role, sortOrder, members: [] });
        }
        map.get(groupKey)!.members.push(m);
      }

      const sortedKeys = Array.from(map.keys()).sort((a, b) => {
        const itemA = map.get(a)!;
        const itemB = map.get(b)!;
        if (itemA.sortOrder !== itemB.sortOrder) return itemA.sortOrder - itemB.sortOrder;
        return itemA.label.localeCompare(itemB.label);
      });

      return sortedKeys.map((key) => {
        const item = map.get(key)!;
        return {
          key,
          label: item.label,
          icon: 'shield_person',
          members: item.members,
        };
      });
    }

    return [];
  }, [groupBy, filteredMembers, domMap]);

  const handleStatusChange = async (id: string, status: SrcyMembershipStatus) => {
    try {
      await updateSrcyMemberStatus(id, status);
      invalidateMemberDetailsCache(id);
      setMembers((current) =>
        current.map((member) =>
          member.id === id ? { ...member, membershipStatus: status, updatedAt: new Date().toISOString() } : member,
        ),
      );
      if (selectedMemberForDetails?.id === id) {
        setSelectedMemberForDetails((current) => current ? { ...current, membershipStatus: status } : null);
      }
    } catch (error: any) {
      setAlert({ title: 'Status Update Failed', message: error?.message || 'Unable to update SRCY status.', tone: 'danger' });
    }
  };

  const handleMemberSaved = (updated: SrcyMemberRecord) => {
    invalidateMemberDetailsCache(updated.id);
    setMembers((current) =>
      current.map((m) => (m.id === updated.id ? updated : m)).sort((a, b) => a.fullName.localeCompare(b.fullName))
    );
    if (selectedMemberForDetails?.id === updated.id) {
      setSelectedMemberForDetails(updated);
    }
    setAlert({
      title: 'Member Updated',
      message: `${updated.fullName}'s membership details have been successfully updated.`,
      tone: 'success',
    });
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSrcyMember(memberToDelete.id);
      invalidateMemberDetailsCache(memberToDelete.id);
      setMembers((current) => current.filter((m) => m.id !== memberToDelete.id));
      if (selectedMemberForDetails?.id === memberToDelete.id) {
        setSelectedMemberForDetails(null);
      }
      setAlert({
        title: 'Member Removed',
        message: `${memberToDelete.fullName} was removed from the SRCY membership directory.`,
        tone: 'success',
      });
      setMemberToDelete(null);
    } catch (err: any) {
      setAlert({
        title: 'Delete Failed',
        message: err?.message || 'Unable to delete SRCY member.',
        tone: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMemberRow = (member: SrcyMemberRecord) => {
    const dom = member.domId ? domMap.get(member.domId) : null;
    const domSummary = getMemberDomValiditySummary(dom);
    const effectiveStatus = domSummary.status;

    return (
      <tr
        key={member.id}
        className="srcy-member-row--clickable"
        onClick={() => setSelectedMemberForDetails(member)}
        title="Click row to view full member details"
      >
        <td>
          <strong className="srcy-learner-name">{member.fullName}</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
            {member.learnerLrn ? (
              <code className="srcy-lrn-code" title="Learner LRN">{member.learnerLrn}</code>
            ) : (
              <span>-</span>
            )}
            {(memberTermCounts.get(member.learnerLrn?.trim() || member.id) || 1) > 1 ? (
              <span className="srcy-terms-pill" title="Has multiple recorded membership terms">
                {memberTermCounts.get(member.learnerLrn?.trim() || member.id)} Terms
              </span>
            ) : null}
            {member.maabId ? (
              <span className="srcy-maab-tag" title="Membership Accident Assistance Benefit ID">
                MAAB: <strong>{member.maabId}</strong>
              </span>
            ) : null}
          </div>
        </td>
        <td>{[member.gradeLevel, member.section].filter(Boolean).join(' - ') || '-'}</td>
        <td>
          <div className="srcy-role-dom-cell">
            <strong className="srcy-member-role">{member.councilRole || 'Member'}</strong>
            {dom ? (
              <span className="srcy-member-dom-pill" title={`Declaration: ${dom.title} (${dom.validFrom} to ${dom.validUntil})`}>
                {dom.domNumber}
              </span>
            ) : (
              <span className="srcy-member-dom-unattached">No DOM</span>
            )}
          </div>
        </td>
        <td>
          <span
            className={getStatusClassName(effectiveStatus)}
            title={domSummary.reason}
          >
            {effectiveStatus}
          </span>
        </td>
        <td>
          <span className="srcy-contact-line">{member.contactNo || '-'}</span>
          {member.email ? <span className="srcy-contact-sub">{member.email}</span> : null}
        </td>
        <td className="srcy-text-right" onClick={(e) => e.stopPropagation()}>
          <div className="srcy-row-actions">
            <button
              type="button"
              className="secondary-button srcy-row-action-btn"
              onClick={() => setSelectedMemberForDetails(member)}
              title="View member details"
            >
              <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
              <span className="srcy-row-btn-label">View</span>
            </button>
            <button
              type="button"
              className="secondary-button srcy-row-action-btn srcy-row-action-btn--mis"
              onClick={() => setSelectedMemberForMis(member)}
              title="Generate Member Information Sheet (MIS)"
            >
              <span className="material-symbols-outlined" aria-hidden="true">assignment_ind</span>
              <span className="srcy-row-btn-label">MIS</span>
            </button>
            {effectiveStatus === 'Inactive' ? (
              <button
                type="button"
                className="secondary-button srcy-row-action-btn srcy-row-action-btn--renew"
                onClick={() => setRenewingMember(member)}
                title="Renew member under new DOM batch"
              >
                <span className="material-symbols-outlined" aria-hidden="true">autorenew</span>
                <span className="srcy-row-btn-label">Renew</span>
              </button>
            ) : null}
            <button
              type="button"
              className="secondary-button srcy-row-action-btn"
              onClick={() => setSelectedMemberForEdit(member)}
              title="Edit member details"
            >
              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
              <span className="srcy-row-btn-label">Edit</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (isLoading) return <UsisPageLoader message="Loading SRCY membership directory..." />;

  return (
    <section className="section-shell">
      <div className="page-intro srcy-page-intro">
        <p className="page-intro__eyebrow">Senior Red Cross Youth Council</p>
        <h1>Membership Directory</h1>
        <p>View, search, and manage registered SRCY council members. Click any row to view full member details.</p>
      </div>

      <section className="srcy-summary-grid" aria-label="Membership counts summary">
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Total Registered</span>
            <strong>{counts.total}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Active Members</span>
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

      <section className="portal-panel">
        <header className="portal-panel__header srcy-list-header">
          <div>
            <h2>Membership List</h2>
            <p className="srcy-panel-header__subtitle">
              {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} showing
              {statusFilter !== 'All' ? ` (${statusFilter} status)` : ''}
            </p>
          </div>
          <div className="srcy-list-header__actions">
            <label className="floating-field srcy-search-field">
              <div className="floating-field__control">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder=" " />
                <span>Search members</span>
              </div>
            </label>
            <div className="srcy-filter-select-wrap">
              <UsisSearchableSelect
                ariaLabel="Filter members by status"
                label="Filter Status"
                floatingLabel
                allowTyping={false}
                forcePortalMenu
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'All')}
                placeholder="All Statuses"
              />
            </div>
            <div className="srcy-filter-select-wrap srcy-filter-select-wrap--group">
              <UsisSearchableSelect
                ariaLabel="Group members list"
                label="Group By"
                floatingLabel
                allowTyping={false}
                forcePortalMenu
                options={groupByOptions}
                value={groupBy}
                onChange={(val) => {
                  setGroupBy((val as GroupByOption) || 'none');
                  setCollapsedGroups(new Set());
                }}
                placeholder="Group By"
              />
            </div>
            <button
              type="button"
              className="secondary-button srcy-register-btn"
              onClick={() => navigate('/dom-records')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">assignment</span>
              <span>DOM Batches</span>
            </button>
            <button
              type="button"
              className="primary-button srcy-register-btn"
              onClick={() => navigate('/memberships')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
              <span>Register Member</span>
            </button>
          </div>
        </header>

        <div className="portal-panel__body">
          {filteredMembers.length === 0 ? (
            <div className="srcy-empty-state">
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
              <p>No SRCY memberships found matching your filters.</p>
              {search || statusFilter !== 'All' || groupBy !== 'none' ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                    setGroupBy('none');
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('/memberships')}
                  style={{ marginTop: '8px' }}
                >
                  Register First Member
                </button>
              )}
            </div>
          ) : (
            <>
              {groupBy !== 'none' ? (
                <div className="srcy-group-toolbar">
                  <div className="srcy-group-toolbar__info">
                    <span className="material-symbols-outlined srcy-group-toolbar__icon" aria-hidden="true">
                      table_rows
                    </span>
                    <span>
                      Grouped by <strong>{groupByOptions.find((o) => o.value === groupBy)?.label}</strong> &bull; {groupedMembers.length} {groupedMembers.length === 1 ? 'group' : 'groups'}
                    </span>
                  </div>
                  <div className="srcy-group-toolbar__actions">
                    <button
                      type="button"
                      className="srcy-group-action-btn"
                      onClick={expandAll}
                      title="Expand all groups"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">unfold_more</span>
                      <span>Expand All</span>
                    </button>
                    <button
                      type="button"
                      className="srcy-group-action-btn"
                      onClick={collapseAll}
                      title="Collapse all groups"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">unfold_less</span>
                      <span>Collapse All</span>
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="srcy-table-wrap">
                <table className="usis-table srcy-members-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Grade &amp; Section</th>
                      <th>Role &amp; DOM Batch</th>
                      <th>Status</th>
                      <th>Contact</th>
                      <th className="srcy-text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupBy === 'none'
                      ? filteredMembers.map(renderMemberRow)
                      : groupedMembers.map((group) => {
                          const isCollapsed = collapsedGroups.has(group.key);
                          return (
                            <Fragment key={group.key}>
                              <tr
                                className="srcy-group-header-row"
                                onClick={() => toggleGroup(group.key)}
                                title={`Click to ${isCollapsed ? 'expand' : 'collapse'} group: ${group.label}`}
                              >
                                <td colSpan={6}>
                                  <div className="srcy-group-header-content">
                                    <button
                                      type="button"
                                      className="srcy-group-toggle-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(group.key);
                                      }}
                                      aria-expanded={!isCollapsed}
                                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} group ${group.label}`}
                                    >
                                      <span className="material-symbols-outlined srcy-group-chevron" aria-hidden="true">
                                        {isCollapsed ? 'chevron_right' : 'expand_more'}
                                      </span>
                                    </button>
                                    {group.icon ? (
                                      <span className="material-symbols-outlined srcy-group-icon" aria-hidden="true">
                                        {group.icon}
                                      </span>
                                    ) : null}
                                    <span className="srcy-group-title">{group.label}</span>
                                    <span className="srcy-group-badge">
                                      {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                                    </span>
                                    {group.subtitle ? (
                                      <span className="srcy-group-subtitle">{group.subtitle}</span>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                              {!isCollapsed && group.members.map(renderMemberRow)}
                            </Fragment>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <MemberDetailsModal
        member={selectedMemberForDetails}
        onClose={() => setSelectedMemberForDetails(null)}
        onEdit={(m) => {
          setSelectedMemberForDetails(null);
          setSelectedMemberForEdit(m);
        }}
        onDelete={(m) => {
          setSelectedMemberForDetails(null);
          setMemberToDelete(m);
        }}
        onRenew={(m) => {
          setSelectedMemberForDetails(null);
          setRenewingMember(m);
        }}
        onGenerateMis={(m) => {
          setSelectedMemberForDetails(null);
          setSelectedMemberForMis(m);
        }}
      />

      <MemberRenewModal
        member={renewingMember}
        onClose={() => setRenewingMember(null)}
        onRenewed={(newMember) => {
          if (renewingMember) invalidateMemberDetailsCache(renewingMember.id);
          invalidateMemberDetailsCache(newMember.id);
          void refresh();
          setSelectedMemberForDetails(newMember);
          setAlert({
            title: 'Membership Renewed',
            message: `${newMember.fullName} has been successfully renewed and attached to a new DOM batch.`,
            tone: 'success',
          });
        }}
      />

      <MemberEditModal
        member={selectedMemberForEdit}
        onClose={() => setSelectedMemberForEdit(null)}
        onSaved={handleMemberSaved}
      />

      <MemberMisModal
        member={selectedMemberForMis}
        onClose={() => setSelectedMemberForMis(null)}
        session={session}
      />

      <UsisAlertModal
        open={Boolean(memberToDelete)}
        title="Confirm Member Deletion"
        message={`Are you sure you want to remove ${memberToDelete?.fullName || 'this member'} from the SRCY membership records? This action cannot be undone.`}
        tone="danger"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Member'}
        cancelLabel="Cancel"
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}

