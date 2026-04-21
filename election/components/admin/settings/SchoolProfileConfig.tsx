
import React, { useState, useEffect } from 'react';
import { ElectionConfig, SchoolYear } from '../../../types';
import { useStore } from '../../../supabaseStore';

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
    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 no-print">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#E11C38]">
          <i className="fa-solid fa-school text-xl"></i>
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">School Profile</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global system branding & current term</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* School Name Input */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Official Institution Name</label>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <i className="fa-solid fa-building-columns absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input 
                type="text"
                value={localSchoolName}
                onChange={(e) => setLocalSchoolName(e.target.value)}
                placeholder="Enter School Name..."
                className="w-full pl-14 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#034F8B] outline-none font-bold text-sm uppercase tracking-widest transition-all"
              />
            </div>
            <button 
              onClick={handleSaveName}
              className="bg-[#034F8B] text-white px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10"
            >
              Update
            </button>
          </div>
        </div>

        {/* School Year Select */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Active School Year</label>
          <div className="relative">
            <i className="fa-solid fa-calendar-check absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
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
            <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start space-x-3">
        <i className="fa-solid fa-circle-info text-blue-500 mt-0.5 text-xs"></i>
        <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
          Changing the Active School Year will switch all election data, candidate lists, and voter registries to the selected term. Existing ballots will remain saved in their respective terms.
        </p>
      </div>
    </div>
  );
};

export default SchoolProfileConfig;
