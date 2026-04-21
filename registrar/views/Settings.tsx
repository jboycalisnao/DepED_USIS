
import React from 'react';
import AcademicCycles from '../components/settings/AcademicCycles';
import UserManagement from '../components/settings/UserManagement';
import GradeLevelManagement from '../components/settings/GradeLevelManagement';
import AcademicClassifications from '../components/settings/AcademicClassifications';

const Settings: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="bg-white p-10 rounded-[48px] shadow-m3-2 border border-surfaceVariant">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-1.5 h-10 bg-primary rounded-full"></div>
          <div>
            <h3 className="text-3xl font-black text-primary uppercase tracking-tighter">Academic Configuration</h3>
            <p className="text-xs font-bold text-outline uppercase tracking-widest">Define the operational scope of your institution</p>
          </div>
        </div>

        <div className="space-y-16">
          {/* School Year Management */}
          <AcademicCycles />

          <div className="h-px bg-surfaceVariant opacity-40"></div>

          {/* User & Access Management */}
          <UserManagement />

          <div className="h-px bg-surfaceVariant opacity-40"></div>

          {/* Grade Level Toggles */}
          <GradeLevelManagement />

          <div className="h-px bg-surfaceVariant opacity-40"></div>

          {/* Strand & Program Registries */}
          <AcademicClassifications />
        </div>
      </div>
    </div>
  );
};

export default Settings;
