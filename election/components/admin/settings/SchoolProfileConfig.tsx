
import React, { useState, useEffect } from 'react';
import { ElectionConfig, SchoolYear } from '../../../types';
import { useStore } from '../../../supabaseStore';
import SearchableSelect from '../../ui/SearchableSelect';

interface SchoolProfileConfigProps {
  config: ElectionConfig;
  onUpdate: (newConfig: ElectionConfig) => void;
  schoolYears: SchoolYear[];
}

const SchoolProfileConfig: React.FC<SchoolProfileConfigProps> = ({ config, onUpdate, schoolYears }) => {
  const store = useStore();
  const [localSchoolName, setLocalSchoolName] = useState(config.schoolName || 'Leon National High School');
  const [selectedSyId, setSelectedSyId] = useState(store.activeSchoolYear.id);

  useEffect(() => {
    setLocalSchoolName(config.schoolName || 'Leon National High School');
  }, [config.schoolName]);

  useEffect(() => {
    setSelectedSyId(store.activeSchoolYear.id);
  }, [store.activeSchoolYear.id]);

  const handleSaveName = () => {
    onUpdate({ ...config, schoolName: localSchoolName });
  };

  const handleSyChange = async (syId: string) => {
    await store.setActiveSchoolYear(syId);
  };

  return (
    <div className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-6 shadow-sm no-print">
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-red-50 text-[#E11C38]">
          <i className="fa-solid fa-school text-[16px]"></i>
        </div>
        <div>
          <h3 className="text-[24px] font-black uppercase tracking-tight text-gray-900">School Profile</h3>
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Global system branding and current term</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="mb-3 block text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Official Institution Name</label>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <i className="fa-solid fa-building-columns pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text"
                value={localSchoolName}
                onChange={(e) => setLocalSchoolName(e.target.value)}
                placeholder="Enter school name"
                className="w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-[#fbfcff] py-[14px] pr-4 pl-12 text-[16px] text-[#12233d] outline-none transition-all duration-200 focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)]"
              />
            </div>
            <button 
              onClick={handleSaveName}
              className="rounded-[12px] bg-[#ce1126] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#b10f21]"
            >
              Update
            </button>
          </div>
        </div>

        <div>
          <SearchableSelect
            id="active-school-year"
            label="Active School Year"
            placeholder="Search school year"
            value={selectedSyId}
            onChange={(syId) => {
              setSelectedSyId(syId);
              handleSyChange(syId);
            }}
            options={schoolYears.map((sy) => ({
              value: sy.id,
              label: `SY ${sy.label}${sy.id === store.activeSchoolYear.id ? ' (ACTIVE)' : ''}`,
            }))}
          />
          {false && (
            <select 
              value={selectedSyId}
              onChange={(e) => handleSyChange(e.target.value)}
              className="w-full pl-14 pr-10 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#034F8B] outline-none font-black text-sm uppercase tracking-widest appearance-none transition-all cursor-pointer"
            >
              {schoolYears.map(sy => (
                <option key={sy.id} value={sy.id}>
                  SY {sy.label} {sy.id === store.activeSchoolYear.id ? '(ACTIVE)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start space-x-3 rounded-[12px] border border-blue-100 bg-blue-50/50 p-4">
        <i className="fa-solid fa-circle-info mt-0.5 text-[13px] text-blue-500"></i>
        <p className="text-[13px] leading-relaxed text-blue-700">
          Changing the Active School Year will switch all election data, candidate lists, and voter registries to the selected term. Existing ballots will remain saved in their respective terms.
        </p>
      </div>
    </div>
  );
};

export default SchoolProfileConfig;
