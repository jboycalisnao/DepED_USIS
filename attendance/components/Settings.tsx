
import React from 'react';
import { TimeSlotSettings, TimeSlot } from '../types';

interface SettingsProps {
  settings: TimeSlotSettings;
  onUpdate: (settings: TimeSlotSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const handleChange = (slot: keyof TimeSlotSettings, field: keyof TimeSlot, value: string) => {
    onUpdate({
      ...settings,
      [slot]: {
        ...settings[slot],
        [field]: value
      }
    });
  };

  const SlotCard = ({ title, slotKey, icon }: { title: string, slotKey: keyof TimeSlotSettings, icon: string }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 hover:border-primary-600/20 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
          <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
        </div>
        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pl-1">Start</label>
          <input 
            type="time" 
            value={settings[slotKey].start}
            onChange={(e) => handleChange(slotKey, 'start', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary-600/10 focus:border-primary-600 outline-none transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pl-1">End</label>
          <input 
            type="time" 
            value={settings[slotKey].end}
            onChange={(e) => handleChange(slotKey, 'end', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary-600/10 focus:border-primary-600 outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-primary-600 text-3xl leading-none">tune</span>
        </div>
        <div>
          <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Configuration</h2>
          <h3 className="text-2xl font-bold text-gray-900 leading-none tracking-tight">System Settings</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SlotCard title="Morning Entry" slotKey="amIn" icon="login" />
        <SlotCard title="Morning Exit" slotKey="amOut" icon="logout" />
        <SlotCard title="Afternoon Entry" slotKey="pmIn" icon="login" />
        <SlotCard title="Afternoon Exit" slotKey="pmOut" icon="logout" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 flex items-start gap-6 shadow-sm">
        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary-600 text-3xl leading-none">policy</span>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy</p>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            Taps occurring within these defined blocks are recorded as valid session events. Taps detected outside these specific ranges will be archived as 
            <span className="text-primary-600 font-bold mx-1 underline decoration-primary-600/20 decoration-2">"Unscheduled activity"</span> 
            to maintain precise audit integrity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
