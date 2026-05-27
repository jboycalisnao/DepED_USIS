import { useMemo } from 'react';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../../common/components/ui/UsisGradeSectionList';
import type { ManagedSection, SectionTrack, SubjectSchedulePresetRecord } from '../../services/subjectsManagementService';
import { getGradeNumber, getProgramLabel, sortByChronologicalTime, sortProgramLabels } from '../utils/timeSlotHelpers';

type Props = {
  autoExpandGradeKey?: string;
  autoExpandSectionKey?: string;
  draftRowsByGroup: Record<string, number>;
  isSubmitting: boolean;
  onAssignCell: (day: string, seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }, slotLabel: string, fromDraftRow?: boolean) => void;
  onCreateRow: (seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (row: SubjectSchedulePresetRecord) => void;
  rows: SubjectSchedulePresetRecord[];
  sections: ManagedSection[];
};

const toMeridiem = (value: string) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return value || '--';
  const hour24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutes} ${suffix}`;
};

export function TimeSlotsGradeProgramList({ autoExpandGradeKey, autoExpandSectionKey, draftRowsByGroup, isSubmitting, onAssignCell, onCreateRow, onDelete, onEdit, rows, sections }: Props) {
  const grades = useMemo<UsisGradeSectionListGrade[]>(() => {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const gradeLabels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const specialPrograms = Array.from(new Set([
      ...sections
        .filter((row) => row.track === 'special_program_ste')
        .map((row) => (row.specialProgram || '').trim())
        .filter(Boolean),
      ...rows
        .filter((row) => row.programScope === 'special_program_ste')
        .map((row) => (row.programName || '').trim())
        .filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b));
    const shsStrands = Array.from(new Set([
      ...sections
        .filter((row) => row.track === 'senior_high_school')
        .map((row) => (row.strand || '').trim())
        .filter(Boolean),
      ...rows
        .filter((row) => row.programScope === 'senior_high_school')
        .map((row) => (row.strand || '').trim())
        .filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b));

    return gradeLabels.map((gradeLabel) => {
      const gradeNo = getGradeNumber(gradeLabel);
      const gradeRows = rows.filter((row) => row.gradeLevel === gradeLabel);
      const programGroups: Array<{ label: string; programName?: string; programScope: SectionTrack; rows: SubjectSchedulePresetRecord[]; strand?: string }> = [];

      if (gradeNo !== null && gradeNo >= 7 && gradeNo <= 10) {
        programGroups.push({
          label: 'Regular',
          programScope: 'regular',
          rows: gradeRows.filter((row) => row.programScope === 'regular'),
        });
        specialPrograms.forEach((programName) => {
          programGroups.push({
            label: programName,
            programName,
            programScope: 'special_program_ste',
            rows: gradeRows.filter((row) => row.programScope === 'special_program_ste' && (row.programName || '').toLowerCase() === programName.toLowerCase()),
          });
        });
      } else {
        (shsStrands.length ? shsStrands : ['No Strand']).forEach((strand) => {
          programGroups.push({
            label: `SHS - ${strand}`,
            programScope: 'senior_high_school',
            rows: gradeRows.filter((row) => row.programScope === 'senior_high_school' && (row.strand || '').toLowerCase() === strand.toLowerCase()),
            strand,
          });
        });
      }

      const sectionItems = programGroups
        .sort((a, b) => sortProgramLabels(a.label, b.label))
        .map(({ label: programLabel, programName, programScope, rows: programRows, strand }) => {
          const groupSeed = { gradeLevel: gradeLabel, programName, programScope, strand };
          const groupKey = `${gradeLabel}|${programScope}|${(programName || '').toLowerCase()}|${(strand || '').toLowerCase()}`;
          const draftRowsCount = draftRowsByGroup[groupKey] || 0;
          const sortedRows = sortByChronologicalTime(programRows);
            const bySlot = new Map<string, SubjectSchedulePresetRecord[]>();
            sortedRows.forEach((row) => {
              const slotKey = (row.label || '--').trim() || '--';
              if (!bySlot.has(slotKey)) bySlot.set(slotKey, []);
              bySlot.get(slotKey)?.push(row);
            });
            const weeklyRows = Array.from(bySlot.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([slotName, slotRows]) => {
                const byDay = new Map<string, SubjectSchedulePresetRecord[]>();
                slotRows.forEach((row) => {
                  if (!byDay.has(row.dayOfWeek)) byDay.set(row.dayOfWeek, []);
                  byDay.get(row.dayOfWeek)?.push(row);
                });
                return { byDay, slotName };
              });

            return {
              content: (
                <div className="ia-time-slots-program-panel">
                  <div className="registry-table-wrap ia-time-slots-week-summary">
                    <table className="registry-table ia-registry-table--enhanced ia-time-slots-week-summary__table">
                      <thead>
                        <tr>
                          <th>Slot</th>
                          {weekDays.map((day) => <th key={day}>{day}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyRows.map(({ byDay, slotName }, index) => (
                          <tr key={slotName}>
                            <td>{`Slot ${index + 1}`}</td>
                            {weekDays.map((day) => {
                              const entries = sortByChronologicalTime(byDay.get(day) || []);
                              return (
                                <td key={`${slotName}-${day}`}>
                                  {entries.length === 0 ? (
                                    <button type="button" className="ia-time-slots-week-summary__empty-btn" onClick={() => onAssignCell(day, groupSeed, slotName, false)}>
                                      Click to open modal and assign a subject
                                    </button>
                                  ) : (
                                    <div className="ia-time-slots-week-summary__cell-list">
                                      {entries.map((entry) => (
                                        <div key={entry.id} className="ia-time-slots-week-summary__cell-item">
                                          <strong>{toMeridiem(entry.startTime)} - {toMeridiem(entry.endTime)}</strong>
                                          <span>{entry.label || '--'}</span>
                                          <div className="registry-table__actions ia-time-slots-week-summary__cell-actions">
                                            <button type="button" className="registry-icon-btn" onClick={() => onEdit(entry)}><span className="material-symbols-outlined">edit</span></button>
                                            <button type="button" className="registry-icon-btn registry-icon-btn--danger" disabled={isSubmitting} onClick={() => { void onDelete(entry.id); }}><span className="material-symbols-outlined">delete</span></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {Array.from({ length: draftRowsCount }).map((_, index) => {
                          const slotLabel = `Slot ${weeklyRows.length + index + 1}`;
                          return (
                            <tr key={`draft-${groupKey}-${index}`}>
                              <td>{slotLabel}</td>
                              {weekDays.map((day) => (
                                <td key={`${groupKey}-draft-${index}-${day}`}>
                                  <button type="button" className="ia-time-slots-week-summary__empty-btn" onClick={() => onAssignCell(day, groupSeed, slotLabel, true)}>
                                    Click to open modal and assign a subject
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                        {weeklyRows.length === 0 && draftRowsCount === 0 ? (
                          <tr>
                            <td colSpan={6}>No rows yet for this program group.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <div className="ia-time-slots-program-panel__actions">
                    <button type="button" className="registry-action-button" onClick={() => onCreateRow(groupSeed)}>Create More Rows</button>
                  </div>
                </div>
              ),
              count: sortedRows.length,
              key: programLabel.toLowerCase().replace(/\s+/g, '-'),
              label: programLabel,
            };
          });

        return {
          countLabel: `${sectionItems.length} program group(s)`,
          key: gradeLabel.toLowerCase().replace(/\s+/g, '-'),
          label: gradeLabel,
          sections: sectionItems,
        };
      });
  }, [draftRowsByGroup, isSubmitting, onAssignCell, onCreateRow, onDelete, onEdit, rows, sections]);

  return (
    <UsisGradeSectionList
      autoExpandGradeKey={autoExpandGradeKey}
      autoExpandSectionKey={autoExpandSectionKey}
      className="ia-subjects-grade-list ia-time-slots-grade-list"
      grades={grades}
      emptyMessage="No presets yet."
    />
  );
}
