
import React from 'react';
import { ElectionConfig, ElectionStatus } from '../../../types';

interface VoterAccessControlProps {
  config: ElectionConfig;
  onUpdate: (newConfig: ElectionConfig) => void;
}

const VoterAccessControl: React.FC<VoterAccessControlProps> = ({ config, onUpdate }) => {
  const handleStatusChange = (status: ElectionStatus) => {
    // Only trigger update if status actually changes
    if (config.status !== status) {
      onUpdate({ ...config, status });
    }
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    onUpdate({ ...config, [field]: value });
  };

  const isPortalActuallyOpen = () => {
    if (config.status === ElectionStatus.MANUAL_OPEN) return true;
    if (config.status === ElectionStatus.MANUAL_CLOSED) return false;
    
    const now = new Date().getTime();
    const start = config.startTime ? new Date(config.startTime).getTime() : 0;
    const end = config.endTime ? new Date(config.endTime).getTime() : Infinity;
    return now >= start && now <= end;
  };

  const actualStatus = isPortalActuallyOpen();

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 no-print">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#034F8B]">
            <i className="fa-solid fa-clock-rotate-left text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Voter Access Control</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage login availability & scheduling</p>
          </div>
        </div>
        
        <div className={`flex items-center px-4 py-2 rounded-xl border ${actualStatus ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-2 h-2 rounded-full mr-3 ${actualStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-[10px] font-black uppercase ${actualStatus ? 'text-green-700' : 'text-red-700'}`}>
            Live Status: {actualStatus ? 'Portal Open' : 'Portal Closed'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Manual Toggles */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Manual Override</p>
          <div className="flex flex-col gap-3">
            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.MANUAL_OPEN)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${config.status === ElectionStatus.MANUAL_OPEN ? 'bg-[#034F8B] border-[#034F8B] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-lock-open mr-3"></i>
                <span className="font-black text-[10px] uppercase">Always Open</span>
              </div>
              {config.status === ElectionStatus.MANUAL_OPEN && <i className="fa-solid fa-check"></i>}
            </button>

            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.MANUAL_CLOSED)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${config.status === ElectionStatus.MANUAL_CLOSED ? 'bg-[#E11C38] border-[#E11C38] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-lock mr-3"></i>
                <span className="font-black text-[10px] uppercase">Force Closed</span>
              </div>
              {config.status === ElectionStatus.MANUAL_CLOSED && <i className="fa-solid fa-check"></i>}
            </button>

            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.SCHEDULED)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${config.status === ElectionStatus.SCHEDULED ? 'bg-[#034F8B] border-[#034F8B] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-calendar-check mr-3"></i>
                <span className="font-black text-[10px] uppercase">Use Schedule</span>
              </div>
              {config.status === ElectionStatus.SCHEDULED && <i className="fa-solid fa-check"></i>}
            </button>
          </div>
        </div>

        {/* Scheduling Inputs */}
        <div className={`lg:col-span-2 space-y-6 p-8 bg-gray-50 rounded-3xl border border-gray-100 transition-opacity ${config.status !== ElectionStatus.SCHEDULED ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-2 mb-4">
             <i className="fa-solid fa-timeline text-blue-500"></i>
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Automation Settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Portal Open Time</label>
              <input 
                type="datetime-local"
                value={config.startTime || ''}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-white bg-white focus:border-blue-500 outline-none font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Portal Close Time</label>
              <input 
                type="datetime-local"
                value={config.endTime || ''}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-white bg-white focus:border-blue-500 outline-none font-bold text-xs"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 leading-relaxed italic">
              <i className="fa-solid fa-circle-info mr-2 text-blue-400"></i>
              When "Use Schedule" is active, voters can only access the login form between these two dates. Outside of this window, they will see a "Portal Closed" message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterAccessControl;
