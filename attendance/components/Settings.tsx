import React from 'react';
import { UsisDateTimePicker } from '../../common/components/ui/UsisDateTimePicker';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import type {
  AttendanceClassDayConfig,
  AttendanceNoClassDateConfig,
  AttendanceScheduleConfig,
  SchoolYearOption,
} from '../types';

interface SettingsProps {
  scheduleConfig: AttendanceScheduleConfig;
  onScheduleConfigChange: (nextConfig: AttendanceScheduleConfig) => void;
  classDayConfig: AttendanceClassDayConfig;
  onClassDayConfigChange: (nextConfig: AttendanceClassDayConfig) => void;
  noClassDates: AttendanceNoClassDateConfig;
  onNoClassDatesChange: (nextConfig: AttendanceNoClassDateConfig) => void;
  activeSchoolYearLabel: string;
  isSettingsLoading: boolean;
  isSchoolYearsLoading: boolean;
  isSettingsSaving: boolean;
  settingsError: string | null;
  schoolYears: SchoolYearOption[];
  selectedSchoolYearId: string;
  onSchoolYearChange: (schoolYearId: string) => void;
}

const cloneScheduleConfig = (scheduleConfig: AttendanceScheduleConfig): AttendanceScheduleConfig =>
  JSON.parse(JSON.stringify(scheduleConfig)) as AttendanceScheduleConfig;

const updateScheduleConfig = (
  scheduleConfig: AttendanceScheduleConfig,
  path: string[],
  value: string,
): AttendanceScheduleConfig => {
  const nextConfig = cloneScheduleConfig(scheduleConfig);
  const [gradeBand, ruleKey, fieldKey, subFieldKey] = path;

  const gradeRule = nextConfig[gradeBand as keyof AttendanceScheduleConfig];
  if (!gradeRule || !ruleKey || !fieldKey) return scheduleConfig;

  const rule = gradeRule[ruleKey as keyof typeof gradeRule];
  if (!rule) return scheduleConfig;

  if (subFieldKey) {
    const group = rule[fieldKey as keyof typeof rule] as { [key: string]: string } | undefined;
    if (!group) return scheduleConfig;
    group[subFieldKey] = value;
    return nextConfig;
  }

  (rule as { [key: string]: unknown })[fieldKey] = value;
  return nextConfig;
};

const TimeField = ({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) => (
  <div className="space-y-1.5">
    <UsisDateTimePicker
      ariaLabel={label}
      helperText={helperText}
      label={label}
      mode="time"
      onChange={onChange}
      showLabel={false}
      step={60}
      value={value}
    />
  </div>
);

const Settings: React.FC<SettingsProps> = ({
  scheduleConfig,
  onScheduleConfigChange,
  classDayConfig,
  onClassDayConfigChange,
  noClassDates,
  onNoClassDatesChange,
  activeSchoolYearLabel,
  isSettingsLoading,
  isSchoolYearsLoading,
  isSettingsSaving,
  settingsError,
  schoolYears,
  selectedSchoolYearId,
  onSchoolYearChange,
}) => {
  const classDayRows = [
    { key: 'sunday', label: 'Sunday' },
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
  ] as const;

  const toggleClassDay = (key: keyof AttendanceClassDayConfig) => {
    onClassDayConfigChange({
      ...classDayConfig,
      [key]: !classDayConfig[key],
    });
  };

  const [noClassDateValue, setNoClassDateValue] = React.useState('');

  const noClassDateItems = [...noClassDates].sort((left, right) => left.localeCompare(right));

  const addNoClassDate = () => {
    const value = noClassDateValue.trim();
    if (!value) return;
    if (noClassDates.includes(value)) {
      setNoClassDateValue('');
      return;
    }
    onNoClassDatesChange([...noClassDateItems, value]);
    setNoClassDateValue('');
  };

  const removeNoClassDate = (value: string) => {
    onNoClassDatesChange(noClassDateItems.filter((date) => date !== value));
  };

  return (
    <div className="w-full space-y-8 pb-20">
      <section className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md border border-primary-200 bg-primary-50 text-primary-700">
            <span className="material-symbols-outlined text-[28px] leading-none">tune</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500">Configuration</p>
            <h2 className="text-[clamp(1.35rem,2.4vw,1.9rem)] font-bold leading-tight text-gray-900">
              System Settings
            </h2>
          </div>
        </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Registrar School Year</p>
          <h3 className="text-[12px] font-semibold text-gray-700">
            Attendance roster follows the selected registrar school year.
          </h3>
          <p className="text-[12px] text-gray-500">
            Active registrar school year: <span className="font-semibold text-gray-900">{activeSchoolYearLabel || '--'}</span>
          </p>
        </div>

        <div className="mt-5 max-w-xl space-y-3">
          <UsisSearchableSelect
            ariaLabel="Attendance school year"
            allowTyping={false}
            floatingLabel
            forcePortalMenu
            label="Attendance School Year"
            onChange={onSchoolYearChange}
            options={[...schoolYears].map((schoolYear) => ({
              label: schoolYear.label,
              value: schoolYear.id,
            }))}
            value={selectedSchoolYearId}
            disabled={isSchoolYearsLoading || isSettingsLoading || isSettingsSaving}
          />
          <p className="text-[12px] text-gray-500">
            Saved to Supabase attendance settings and reloaded on the next session.
          </p>
        </div>

        {settingsError ? (
          <p className="mt-4 text-[12px] font-medium text-red-600">{settingsError}</p>
        ) : null}
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Class Day Calendar</p>
            <h3 className="text-[12px] font-semibold text-gray-700">Mark which days have classes.</h3>
            <p className="text-[12px] text-gray-500">
              These days drive the teacher calendar, learner attendance service, and absent counts.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
            {classDayRows.map((day) => {
              const isActive = classDayConfig[day.key];
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`attendance-class-day-toggle ${isActive ? 'attendance-class-day-toggle--active' : ''}`}
                  onClick={() => toggleClassDay(day.key)}
                  disabled={isSettingsLoading || isSettingsSaving}
                  aria-pressed={isActive}
                >
                  <span className="attendance-class-day-toggle__label">{day.label}</span>
                  <span className="attendance-class-day-toggle__state">{isActive ? 'Class day' : 'No class'}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Specific No-Class Dates</p>
              <h3 className="text-[12px] font-semibold text-gray-700">Pick exact dates inside a month that have no classes.</h3>
              <p className="text-[12px] text-gray-500">
                These override the weekday class-day settings and stay blank in the teacher matrix, learner portal, and SF2.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <UsisDateTimePicker
                ariaLabel="No-class date"
                label="No-Class Date"
                mode="date"
                onChange={setNoClassDateValue}
                showLabel={false}
                value={noClassDateValue}
              />
              <button
                type="button"
                className="attendance-class-day-toggle attendance-class-day-toggle--active h-full min-h-[56px] px-4"
                onClick={addNoClassDate}
                disabled={isSettingsLoading || isSettingsSaving || !noClassDateValue.trim()}
              >
                <span className="attendance-class-day-toggle__label">Add Date</span>
                <span className="attendance-class-day-toggle__state">Mark no class</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {noClassDateItems.length > 0 ? (
                noClassDateItems.map((date) => (
                  <button
                    key={date}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => removeNoClassDate(date)}
                    disabled={isSettingsLoading || isSettingsSaving}
                    aria-label={`Remove no-class date ${date}`}
                    title="Remove date"
                  >
                    <span>{date}</span>
                    <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                  </button>
                ))
              ) : (
                <p className="text-[12px] text-gray-500">No specific dates added yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Grades 7-10</p>
          <h3 className="mt-2 text-[12px] font-semibold text-gray-700">Full day schedule</h3>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="AM In Start"
                value={scheduleConfig.grade7To10.amIn.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'amIn', 'in', 'start'], value))}
              />
              <TimeField
                label="AM In End"
                value={scheduleConfig.grade7To10.amIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'amIn', 'in', 'end'], value))}
              />
            </div>
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="Late After"
                value={scheduleConfig.grade7To10.amIn.lateAfter || scheduleConfig.grade7To10.amIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'amIn', 'lateAfter'], value))}
              />
              <TimeField
                label="AM Out Start"
                value={scheduleConfig.grade7To10.amOut.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'amOut', 'in', 'start'], value))}
              />
              <TimeField
                label="AM Out End"
                value={scheduleConfig.grade7To10.amOut.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'amOut', 'in', 'end'], value))}
              />
            </div>
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="PM In Start"
                value={scheduleConfig.grade7To10.pmIn.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'pmIn', 'in', 'start'], value))}
              />
              <TimeField
                label="PM In End"
                value={scheduleConfig.grade7To10.pmIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'pmIn', 'in', 'end'], value))}
              />
            </div>
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="Late After"
                value={scheduleConfig.grade7To10.pmIn.lateAfter || scheduleConfig.grade7To10.pmIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'pmIn', 'lateAfter'], value))}
              />
              <TimeField
                label="PM Out Start"
                value={scheduleConfig.grade7To10.pmOut.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'pmOut', 'in', 'start'], value))}
              />
              <TimeField
                label="PM Out End"
                value={scheduleConfig.grade7To10.pmOut.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade7To10', 'pmOut', 'in', 'end'], value))}
              />
            </div>
          </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Grade 11</p>
          <h3 className="mt-2 text-[12px] font-semibold text-gray-700">Morning-only schedule</h3>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="AM In Start"
                value={scheduleConfig.grade11.amIn.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade11', 'amIn', 'in', 'start'], value))}
              />
              <TimeField
                label="AM In End"
                value={scheduleConfig.grade11.amIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade11', 'amIn', 'in', 'end'], value))}
              />
            </div>
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="Late After"
                value={scheduleConfig.grade11.amIn.lateAfter || scheduleConfig.grade11.amIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade11', 'amIn', 'lateAfter'], value))}
              />
              <TimeField
                label="AM Out Start"
                value={scheduleConfig.grade11.amOut.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade11', 'amOut', 'in', 'start'], value))}
              />
              <TimeField
                label="AM Out End"
                value={scheduleConfig.grade11.amOut.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade11', 'amOut', 'in', 'end'], value))}
              />
            </div>
          </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Grade 12</p>
          <h3 className="mt-2 text-[12px] font-semibold text-gray-700">Afternoon-only schedule</h3>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="PM In Start"
                value={scheduleConfig.grade12.pmIn.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade12', 'pmIn', 'in', 'start'], value))}
              />
              <TimeField
                label="PM In End"
                value={scheduleConfig.grade12.pmIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade12', 'pmIn', 'in', 'end'], value))}
              />
            </div>
            <div className="floating-field-grid floating-field-grid--two">
              <TimeField
                label="Late After"
                value={scheduleConfig.grade12.pmIn.lateAfter || scheduleConfig.grade12.pmIn.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade12', 'pmIn', 'lateAfter'], value))}
              />
              <TimeField
                label="PM Out Start"
                value={scheduleConfig.grade12.pmOut.in.start}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade12', 'pmOut', 'in', 'start'], value))}
              />
              <TimeField
                label="PM Out End"
                value={scheduleConfig.grade12.pmOut.in.end}
                onChange={(value) => onScheduleConfigChange(updateScheduleConfig(scheduleConfig, ['grade12', 'pmOut', 'in', 'end'], value))}
              />
            </div>
          </div>
          </div>
        </article>
      </section>

      <section className="notice-box">
        <strong>Save behavior</strong>
        <span>
          Changes are saved to the <code>attendance_settings</code> table automatically after you edit the times, school year, or class days.
        </span>
      </section>
    </div>
  );
};

export default Settings;
