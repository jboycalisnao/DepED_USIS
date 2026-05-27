import { useMemo } from 'react';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../../common/components/ui/UsisGradeSectionList';
import type { SubjectSchedulePresetRecord } from '../../services/subjectsManagementService';
import { getGradeNumber, getProgramLabel, sortByChronologicalTime, sortProgramLabels } from '../utils/timeSlotHelpers';

type Props = {
  isSubmitting: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: (row: SubjectSchedulePresetRecord) => void;
  rows: SubjectSchedulePresetRecord[];
};

export function TimeSlotsGradeProgramList({ isSubmitting, onDelete, onEdit, rows }: Props) {
  const grades = useMemo<UsisGradeSectionListGrade[]>(() => {
    const byGrade = new Map<string, SubjectSchedulePresetRecord[]>();
    rows.forEach((row) => {
      const key = row.gradeLevel || 'Unspecified Grade';
      if (!byGrade.has(key)) byGrade.set(key, []);
      byGrade.get(key)?.push(row);
    });

    return Array.from(byGrade.entries())
      .sort((a, b) => {
        const aNo = getGradeNumber(a[0]) ?? 999;
        const bNo = getGradeNumber(b[0]) ?? 999;
        return aNo - bNo || a[0].localeCompare(b[0]);
      })
      .map(([gradeLabel, gradeRows]) => {
        const byProgram = new Map<string, SubjectSchedulePresetRecord[]>();
        gradeRows.forEach((row) => {
          const programKey = getProgramLabel(row);
          if (!byProgram.has(programKey)) byProgram.set(programKey, []);
          byProgram.get(programKey)?.push(row);
        });

        const sections = Array.from(byProgram.entries())
          .sort((a, b) => sortProgramLabels(a[0], b[0]))
          .map(([programLabel, programRows]) => {
            const sortedRows = sortByChronologicalTime(programRows);

            return {
              content: (
                <div className="registry-table-wrap">
                  <table className="registry-table ia-registry-table--enhanced">
                    <thead><tr><th>Slot</th><th>Day</th><th>Time</th><th>Room</th><th>Strand</th><th>Actions</th></tr></thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.label || '--'}</td>
                          <td>{row.dayOfWeek}</td>
                          <td>{row.startTime} - {row.endTime}</td>
                          <td>{row.room || '--'}</td>
                          <td>{row.strand || '--'}</td>
                          <td>
                            <div className="registry-table__actions">
                              <button type="button" className="registry-icon-btn" onClick={() => onEdit(row)}><span className="material-symbols-outlined">edit</span></button>
                              <button type="button" className="registry-icon-btn registry-icon-btn--danger" disabled={isSubmitting} onClick={() => { void onDelete(row.id); }}><span className="material-symbols-outlined">delete</span></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
              count: sortedRows.length,
              key: programLabel.toLowerCase().replace(/\s+/g, '-'),
              label: programLabel,
            };
          });

        return {
          countLabel: `${gradeRows.length} schedule record(s)`,
          key: gradeLabel.toLowerCase().replace(/\s+/g, '-'),
          label: gradeLabel,
          sections,
        };
      });
  }, [isSubmitting, onDelete, onEdit, rows]);

  return <UsisGradeSectionList className="ia-subjects-grade-list ia-time-slots-grade-list" grades={grades} emptyMessage="No presets yet." />;
}
