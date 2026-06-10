import React from 'react';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import { TimeSlotSettings, TimeSlot } from '../types';
import type { SchoolYearOption } from '../types';

interface SettingsProps {
  settings: TimeSlotSettings;
  onUpdate: (settings: TimeSlotSettings) => void;
  activeSchoolYearLabel: string;
  isSchoolYearsLoading: boolean;
  schoolYears: SchoolYearOption[];
  selectedSchoolYearId: string;
  onSchoolYearChange: (schoolYearId: string) => void;
}

type SlotKey = keyof TimeSlotSettings;

const SLOT_META: Record<SlotKey, { title: string; icon: string; tone: string }> = {
  amIn: { title: 'Morning Entry', icon: 'login', tone: 'border-primary-200 bg-primary-50 text-primary-700' },
  amOut: { title: 'Morning Exit', icon: 'logout', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  pmIn: { title: 'Afternoon Entry', icon: 'login', tone: 'border-primary-200 bg-primary-50 text-primary-700' },
  pmOut: { title: 'Afternoon Exit', icon: 'logout', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
};

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, activeSchoolYearLabel, isSchoolYearsLoading, schoolYears, selectedSchoolYearId, onSchoolYearChange }) => {
  const handleChange = (slot: SlotKey, field: keyof TimeSlot, value: string) => {
    onUpdate({
      ...settings,
      [slot]: {
        ...settings[slot],
        [field]: value,
      },
    });
  };

  return (
    <div className="w-full space-y-8 pb-20">
      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
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
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Registrar School Year</p>
          <h3 className="text-[12px] font-semibold text-gray-700">
            Attendance roster follows the selected registrar school year.
          </h3>
          <p className="text-[12px] text-gray-500">
            Active registrar school year: <span className="font-semibold text-gray-900">{activeSchoolYearLabel || '--'}</span>
          </p>
        </div>

        <div className="mt-5 max-w-xl">
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
            disabled={isSchoolYearsLoading}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(Object.keys(SLOT_META) as SlotKey[]).map((slotKey) => {
          const meta = SLOT_META[slotKey];

          return (
            <article key={slotKey} className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-md border ${meta.tone}`}>
                  <span className="material-symbols-outlined text-[22px] leading-none">
                    {meta.icon}
                  </span>
                </div>
                <h3 className="text-[12px] font-semibold text-gray-700">{meta.title}</h3>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500">Start</label>
                  <input
                    type="time"
                    value={settings[slotKey].start}
                    onChange={(e) => handleChange(slotKey, 'start', e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500">End</label>
                  <input
                    type="time"
                    value={settings[slotKey].end}
                    onChange={(e) => handleChange(slotKey, 'end', e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </section>

    </div>
  );
};

export default Settings;
