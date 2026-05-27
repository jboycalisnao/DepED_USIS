import { useMemo, useState } from 'react';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../../common/components/ui/UsisGradeSectionList';
import { SubjectManagementFormModal } from '../components/SubjectManagementFormModal';
import { useSubjectManagement } from '../hooks/useSubjectManagement';
import type { SubjectManagementRecord } from '../services/subjectManagementService';

const scopeLabelMap = {
  regular: 'Regular',
  senior_high_school: 'SHS',
  special_program_ste: 'STE / Special',
} as const;

const typeLabelMap = {
  core: 'Core',
  elective: 'Elective',
} as const;

export function SubjectManagementPage() {
  const {
    error,
    filteredRows,
    isLoading,
    isSubmitting,
    notice,
    query,
    remove,
    save,
    scopeFilter,
    setNotice,
    setQuery,
    setScopeFilter,
    strands,
    departments,
  } = useSubjectManagement();
  const [editing, setEditing] = useState<SubjectManagementRecord | null>(null);
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((department) => map.set(department.value, department.label));
    return map;
  }, [departments]);

  const groupedRows = useMemo<UsisGradeSectionListGrade[]>(() => {
    const gradeBucket = new Map<string, SubjectManagementRecord[]>();
    filteredRows.forEach((row) => {
      const current = gradeBucket.get(row.gradeLevel) || [];
      current.push(row);
      gradeBucket.set(row.gradeLevel, current);
    });

    const gradeOrder = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const gradeKeys = Array.from(gradeBucket.keys()).sort((a, b) => {
      const left = gradeOrder.indexOf(a);
      const right = gradeOrder.indexOf(b);
      if (left === -1 && right === -1) return a.localeCompare(b);
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    });

    return gradeKeys.map((gradeKey) => {
      const rows = gradeBucket.get(gradeKey) || [];
      const sectionBucket = new Map<string, SubjectManagementRecord[]>();
      rows.forEach((row) => {
        const sectionKey = `${row.programScope}::${row.strand || 'none'}`;
        const current = sectionBucket.get(sectionKey) || [];
        current.push(row);
        sectionBucket.set(sectionKey, current);
      });

      const sections = Array.from(sectionBucket.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([sectionKey, records]) => {
          const sample = records[0];
          const sectionLabel = `${scopeLabelMap[sample.programScope]}${sample.strand ? ` - ${sample.strand}` : ''}`;
          return {
            content: (
              <div className="registry-table-wrap">
                <table className="registry-table ia-registry-table--enhanced">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.subjectCode}</strong></td>
                        <td>{row.subjectTitle}</td>
                        <td>{departmentNameById.get(row.departmentId) || '--'}</td>
                        <td><span className="modal-record__chip">{typeLabelMap[row.subjectType]}</span></td>
                        <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <div className="registry-table__actions">
                            <button type="button" className="registry-icon-btn registry-icon-btn--primary" onClick={() => setEditing(row)}>
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button type="button" className="registry-icon-btn registry-icon-btn--danger" onClick={() => void remove(row.id)}>
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
            count: records.length,
            key: sectionKey,
            label: sectionLabel,
          };
        });

      return {
        countLabel: `${rows.length} Subject Record(s)`,
        key: gradeKey,
        label: gradeKey,
        sections,
      };
    });
  }, [filteredRows, remove]);

  if (isLoading) return <UsisPageLoader message="Loading subject management..." />;

  return (
    <div className="admin-panel registry-page--unified">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <div className="ia-subjects-page__header">
              <p className="section-card__eyebrow">Grades and Subjects</p>
              <h3>Subject Management</h3>
              <p className="registry-copy">Create and manage grade-level core and elective subjects for Regular, STE/Special Program, and SHS strands.</p>
            </div>
            <div className="registry-toolbar ia-subjects-page__toolbar">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
                  <span>Search Subject / Grade / Scope / Strand</span>
                </div>
              </label>
              <button type="button" className="registry-action-button" onClick={() => setEditing({} as SubjectManagementRecord)}>Create Subject</button>
            </div>
            <div className="modal-record__chips ia-subjects-track-filter">
              <button type="button" className={`modal-record__chip${scopeFilter === 'all' ? ' is-active' : ''}`} onClick={() => setScopeFilter('all')}>All</button>
              <button type="button" className={`modal-record__chip${scopeFilter === 'regular' ? ' is-active' : ''}`} onClick={() => setScopeFilter('regular')}>Regular</button>
              <button type="button" className={`modal-record__chip${scopeFilter === 'special_program_ste' ? ' is-active' : ''}`} onClick={() => setScopeFilter('special_program_ste')}>STE / Special</button>
              <button type="button" className={`modal-record__chip${scopeFilter === 'senior_high_school' ? ' is-active' : ''}`} onClick={() => setScopeFilter('senior_high_school')}>SHS</button>
            </div>
            <div className="registry-list">
              <UsisGradeSectionList
                className="ia-subjects-grade-list"
                emptyMessage="No subjects found."
                grades={groupedRows}
              />
            </div>
          </div>
        </article>
      </div>
      {editing ? (
        <SubjectManagementFormModal
          departments={departments}
          initialValue={editing.id ? editing : null}
          isSubmitting={isSubmitting}
          onClose={() => {
            setEditing(null);
            setNotice('');
          }}
          onSubmit={async (payload) => {
            await save(payload);
            setEditing(null);
          }}
          strands={strands}
        />
      ) : null}
    </div>
  );
}
