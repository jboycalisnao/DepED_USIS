import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../common/components/ui/UsisGradeSectionList';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { SectionSubjectsPreview } from '../components/SectionSubjectsPreview';
import { SectionSubjectsModal } from '../components/SectionSubjectsModal';
import { useSubjectsManagement } from '../hooks/useSubjectsManagement';
import type { ManagedSection, SectionTrack } from '../services/subjectsManagementService';

export function SubjectsManagementPage() {
  const { filteredRows, isLoading, query, refresh, setQuery, setTrackFilter, trackFilter } = useSubjectsManagement();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<ManagedSection | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [lastExpandedGradeKey, setLastExpandedGradeKey] = useState('');
  const [lastExpandedSectionKey, setLastExpandedSectionKey] = useState('');

  const groupedGrades = useMemo<UsisGradeSectionListGrade[]>(() => {
    const gradeMap = new Map<string, ManagedSection[]>();
    filteredRows.forEach((row) => {
      const key = row.gradeLevel || 'Unassigned';
      const current = gradeMap.get(key) || [];
      current.push(row);
      gradeMap.set(key, current);
    });

    const sortGradeKeys = Array.from(gradeMap.keys()).sort((left, right) => {
      const extract = (value: string) => {
        const match = String(value).match(/\b(7|8|9|10|11|12)\b/);
        return match ? Number(match[1]) : 999;
      };
      return extract(left) - extract(right);
    });

    return sortGradeKeys.map((gradeKey) => {
      const sections = (gradeMap.get(gradeKey) || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => ({
          content: <SectionSubjectsPreview section={row} onManage={(section, presetId) => {
            setSelectedSection(section);
            setSelectedPresetId(presetId || '');
          }} />,
          count: row.subjectCount,
          key: row.id,
          label: row.name,
        }));

      return {
        countLabel: `${sections.length} Active Sections`,
        key: gradeKey,
        label: gradeKey,
        sections,
      };
    });
  }, [filteredRows]);

  if (isLoading) return <UsisPageLoader message="Loading grades and subjects..." />;

  return (
    <div className="admin-panel registry-page--unified">
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <div className="ia-subjects-page__header">
              <p className="section-card__eyebrow">Grades and Subjects</p>
              <h3>Subjects</h3>
              <p className="registry-copy">Manage section subjects for Regular, STE/Special Programs, and Senior High School.</p>
            </div>
            <div className="registry-toolbar ia-subjects-page__toolbar">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder=" " />
                  <span>Search Section / Grade / Track</span>
                </div>
              </label>
              <button type="button" className="registry-action-button" onClick={() => navigate('/functions/grades-subjects/time-slots')}>
                Subject Schedule
              </button>
            </div>
            <div className="modal-record__chips ia-subjects-track-filter">
              <button type="button" className={`modal-record__chip${trackFilter === 'all' ? ' is-active' : ''}`} onClick={() => setTrackFilter('all')}>All</button>
              <button type="button" className={`modal-record__chip${trackFilter === 'regular' ? ' is-active' : ''}`} onClick={() => setTrackFilter('regular')}>Regular</button>
              <button type="button" className={`modal-record__chip${trackFilter === 'special_program_ste' ? ' is-active' : ''}`} onClick={() => setTrackFilter('special_program_ste')}>STE / Special</button>
              <button type="button" className={`modal-record__chip${trackFilter === 'senior_high_school' ? ' is-active' : ''}`} onClick={() => setTrackFilter('senior_high_school')}>SHS</button>
            </div>
            <UsisGradeSectionList
              autoExpandGradeKey={lastExpandedGradeKey}
              autoExpandSectionKey={lastExpandedSectionKey}
              className="ia-subjects-grade-list"
              emptyMessage="No sections found."
              grades={groupedGrades}
            />
          </div>
        </article>
      </div>
      {selectedSection ? <SectionSubjectsModal
        section={selectedSection}
        initialPresetId={selectedPresetId}
        onClose={() => { setSelectedSection(null); setSelectedPresetId(''); }}
        onSaved={async () => {
          setLastExpandedGradeKey(selectedSection.gradeLevel);
          setLastExpandedSectionKey(selectedSection.id);
          await refresh();
        }}
      /> : null}
    </div>
  );
}
