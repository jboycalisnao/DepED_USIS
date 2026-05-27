import { useEffect, useMemo, useState } from 'react';
import type { ManagedSection, SectionSubjectScheduleRecord, SectionTrack, SubjectSchedulePresetRecord } from '../services/subjectsManagementService';
import { loadApplicableSchedulePresetsForSection, loadSectionSubjectSchedules } from '../services/subjectsManagementService';

const trackLabel: Record<SectionTrack, string> = {
  regular: 'Regular',
  senior_high_school: 'Senior High School',
  special_program_ste: 'Special Program (STE)',
};

type Props = {
  onManage: (section: ManagedSection, presetId?: string) => void;
  section: ManagedSection;
};

export function SectionSubjectsPreview({ onManage, section }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [presets, setPresets] = useState<SubjectSchedulePresetRecord[]>([]);
  const [schedules, setSchedules] = useState<SectionSubjectScheduleRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [presetRows, scheduleRows] = await Promise.all([
          loadApplicableSchedulePresetsForSection(section),
          loadSectionSubjectSchedules([section.id]),
        ]);
        if (!isMounted) return;
        setPresets(presetRows.filter((row) => row.isActive));
        setSchedules(scheduleRows.filter((row) => row.isActive));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [section]);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const toMinutes = (value: string) => {
    const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number(match[1]) * 60 + Number(match[2]);
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

  const matrixRows = useMemo(() => {
    const bySlot = new Map<string, SubjectSchedulePresetRecord[]>();
    presets.forEach((row) => {
      const key = (row.label || '--').trim() || '--';
      if (!bySlot.has(key)) bySlot.set(key, []);
      bySlot.get(key)?.push(row);
    });
    return Array.from(bySlot.entries())
      .sort((a, b) => {
        const aStart = Math.min(...a[1].map((row) => toMinutes(row.startTime)));
        const bStart = Math.min(...b[1].map((row) => toMinutes(row.startTime)));
        return aStart - bStart || a[0].localeCompare(b[0]);
      })
      .map(([slotName, slotPresets]) => ({
        slotName,
        slotPresets,
      }));
  }, [presets]);

  const teacherBySubjectCode = useMemo(() => {
    const map = new Map<string, string>();
    (section.subjects || []).forEach((row) => {
      const code = String(row.subjectCode || '').trim().toUpperCase();
      if (!code) return;
      map.set(code, String(row.teacherName || '').trim());
    });
    return map;
  }, [section.subjects]);

  return (
    <div className="ia-subjects-section-view">
      <div className="ia-subjects-section-view__header">
        <div className="ia-subjects-section-view__meta">
          <p><strong>Track:</strong> {trackLabel[section.track]}</p>
          <p><strong>Adviser:</strong> {section.adviserName || 'Not Set'}</p>
        </div>
        <button type="button" className="registry-action-button" onClick={() => onManage(section)}>
          Manage Subjects
        </button>
      </div>
      <div className="registry-table-wrap ia-subjects-section-matrix-wrap">
        <table className="registry-table ia-registry-table--enhanced ia-subjects-section-matrix">
          <thead>
            <tr>
              <th>Slot</th>
              {weekDays.map((day) => <th key={day}>{day}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6}>Loading schedule matrix...</td></tr>
            ) : matrixRows.length === 0 ? (
              <tr><td colSpan={6}>No time slots available for this section program yet.</td></tr>
            ) : matrixRows.map(({ slotName, slotPresets }, index) => (
              <tr key={`${slotName}-${index}`}>
                <td>{`Slot ${index + 1}`}</td>
                {weekDays.map((day) => {
                  const dayPreset = slotPresets.find((row) => row.dayOfWeek === day);
                  if (!dayPreset) return <td key={`${slotName}-${day}`}>--</td>;
                  const assigned = schedules.filter((row) => {
                    const samePreset = row.presetId && row.presetId === dayPreset.id;
                    const fallbackMatch = row.dayOfWeek === dayPreset.dayOfWeek && row.startTime === dayPreset.startTime && row.endTime === dayPreset.endTime;
                    return samePreset || fallbackMatch;
                  });
                  return (
                    <td key={`${slotName}-${day}`}>
                      <button type="button" className="ia-subjects-section-matrix__cell-btn" onClick={() => onManage(section, dayPreset.id)}>
                        <strong>{toMeridiem(dayPreset.startTime)} - {toMeridiem(dayPreset.endTime)}</strong>
                        <span>{slotName}</span>
                        {assigned.length > 0 ? (
                          <small>
                            {assigned
                              .map((row) => {
                                const teacherName = teacherBySubjectCode.get(String(row.subjectCode || '').trim().toUpperCase()) || '';
                                return teacherName ? `${row.subjectTitle} - ${teacherName}` : row.subjectTitle;
                              })
                              .join(', ')}
                          </small>
                        ) : <small>Click to assign subject</small>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
