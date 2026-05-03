
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
    <div className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-6 shadow-sm no-print">
      <div className="mb-6 flex items-center">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-blue-50 text-[#034F8B]">
            <i className="fa-solid fa-clock-rotate-left text-[16px]"></i>
          </div>
          <div>
            <h3 className="text-[24px] font-black uppercase tracking-tight text-gray-900">Voter Access Control</h3>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Manage login availability and scheduling</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Manual Override</p>
          <div className="flex flex-col gap-3">
            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.MANUAL_OPEN)}
              className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-4 py-4 text-left transition-colors ${config.status === ElectionStatus.MANUAL_OPEN ? 'border-[rgba(0,56,168,0.24)] bg-[#eef4ff] text-[#0038a8]' : 'border-[rgba(18,35,61,0.14)] bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-lock-open mr-3"></i>
                <span className="text-[13px] font-bold uppercase tracking-[0.08em]">Always Open</span>
              </div>
              {config.status === ElectionStatus.MANUAL_OPEN && <i className="fa-solid fa-check"></i>}
            </button>

            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.MANUAL_CLOSED)}
              className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-4 py-4 text-left transition-colors ${config.status === ElectionStatus.MANUAL_CLOSED ? 'border-[rgba(206,17,38,0.24)] bg-[#fff5f6] text-[#ce1126]' : 'border-[rgba(18,35,61,0.14)] bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-lock mr-3"></i>
                <span className="text-[13px] font-bold uppercase tracking-[0.08em]">Force Closed</span>
              </div>
              {config.status === ElectionStatus.MANUAL_CLOSED && <i className="fa-solid fa-check"></i>}
            </button>

            <button 
              type="button"
              onClick={() => handleStatusChange(ElectionStatus.SCHEDULED)}
              className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-4 py-4 text-left transition-colors ${config.status === ElectionStatus.SCHEDULED ? 'border-[rgba(0,56,168,0.24)] bg-[#eef4ff] text-[#0038a8]' : 'border-[rgba(18,35,61,0.14)] bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center pointer-events-none">
                <i className="fa-solid fa-calendar-check mr-3"></i>
                <span className="text-[13px] font-bold uppercase tracking-[0.08em]">Use Schedule</span>
              </div>
              {config.status === ElectionStatus.SCHEDULED && <i className="fa-solid fa-check"></i>}
            </button>
          </div>
        </div>

        <div className={`lg:col-span-2 space-y-6 rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-slate-50 p-6 transition-opacity ${config.status !== ElectionStatus.SCHEDULED ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
          <div className="mb-4 flex items-center space-x-2">
             <i className="fa-solid fa-timeline text-blue-500"></i>
             <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-600">Automation Settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Portal Open Time</label>
              <input 
                type="datetime-local"
                value={config.startTime || ''}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-4 py-[14px] text-[16px] text-[#12233d] outline-none transition-all duration-200 focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Portal Close Time</label>
              <input 
                type="datetime-local"
                value={config.endTime || ''}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-4 py-[14px] text-[16px] text-[#12233d] outline-none transition-all duration-200 focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)]"
              />
            </div>
          </div>

          <div className="rounded-[12px] border border-gray-200 bg-white p-4">
            <p className="text-[13px] leading-relaxed text-slate-600">
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
