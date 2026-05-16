
import React from 'react';
import { UsisUnifiedHeader } from '../../common/header/UsisUnifiedHeader';

interface HeaderProps {
  monitors: any[];
  baudRates: number[];
  currentView: 'registrar' | 'attendance' | 'settings';
  onViewChange: (view: 'registrar' | 'attendance' | 'settings') => void;
  onBaudRateChange: (index: number, baud: number) => void;
  onConnect: (index: number) => void;
  onDisconnect: (index: number) => void;
  onEnterKiosk: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  monitors, baudRates, currentView, onViewChange, onBaudRateChange, onConnect, onDisconnect, onEnterKiosk 
}) => {
  return (
    <div className="attendance-header">
      <UsisUnifiedHeader
        searchId="attendance-search"
        searchLabel="Search attendance module"
        actions={
          <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200 shadow-sm">
          <button 
            onClick={() => onViewChange('registrar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentView === 'registrar' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">person_add</span>
            Registrar
          </button>
          <button 
            onClick={() => onViewChange('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentView === 'attendance' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">history</span>
            Records
          </button>
          <button 
            onClick={() => onViewChange('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentView === 'settings' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">settings</span>
            Settings
          </button>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block" />

        <div className="flex items-center gap-3">
          <button 
            onClick={onEnterKiosk}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg leading-none">fullscreen</span>
            Kiosk
          </button>
          
          <div className="flex flex-col gap-2">
            {monitors.map((m, i) => (
              <div key={i} className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 px-2">M{i+1}</span>
                <select 
                  value={baudRates[i]} 
                  onChange={e => onBaudRateChange(i, Number(e.target.value))} 
                  className="bg-transparent text-[11px] font-semibold outline-none px-2 cursor-pointer text-gray-600 border-none appearance-none"
                >
                  <option value={9600}>9600</option>
                  <option value={115200}>115200</option>
                </select>
                <button 
                  onClick={m.status === 'connected' ? () => onDisconnect(i) : () => onConnect(i)} 
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    m.status === 'connected' 
                    ? 'bg-error-600 text-white shadow-sm hover:bg-error-700' 
                    : 'bg-success-600 text-white shadow-sm hover:bg-success-700'
                  }`}
                >
                  {m.status === 'connected' ? 'OFF' : 'ON'}
                </button>
              </div>
            ))}
          </div>
        </div>
          </div>
        }
      />
    </div>
  );
};

export default Header;
