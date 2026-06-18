import React from 'react';
import { UsisDateTimePicker } from '../../common/components/ui/UsisDateTimePicker';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import type { AttendanceScheduleConfig, SchoolYearOption } from '../types';

interface SettingsProps {
  scheduleConfig: AttendanceScheduleConfig;
  onScheduleConfigChange: (nextConfig: AttendanceScheduleConfig) => void;
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
  activeSchoolYearLabel,
  isSettingsLoading,
  isSchoolYearsLoading,
  isSettingsSaving,
  settingsError,
  schoolYears,
  selectedSchoolYearId,
  onSchoolYearChange,
}) => {
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
          Changes are saved to the <code>attendance_settings</code> table automatically after you edit the times or school year.
        </span>
      </section>
    </div>
  );
};

export default Settings;
