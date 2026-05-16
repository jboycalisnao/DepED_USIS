
import React, { useState } from 'react';
import { AttendanceRecord, Learner, AttendanceType } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface AttendanceLogsProps {
  logs: AttendanceRecord[];
  learners: Learner[];
  onDelete: (id: string) => void;
}

const AttendanceLogs: React.FC<AttendanceLogsProps> = ({ logs, learners, onDelete }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sortedLogs = [...logs].reverse();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLabelAndColor = (type: AttendanceType) => {
    switch (type) {
      case 'AM_IN': return { label: 'AM In', color: 'text-primary-700 bg-primary-50 border-primary-600/20' };
      case 'AM_OUT': return { label: 'AM Out', color: 'text-accent-700 bg-accent-50 border-accent-600/20' };
      case 'PM_IN': return { label: 'PM In', color: 'text-primary-700 bg-primary-50 border-primary-600/20' };
      case 'PM_OUT': return { label: 'PM Out', color: 'text-accent-700 bg-accent-50 border-accent-600/20' };
      default: return { label: 'Unknown', color: 'text-gray-500 bg-gray-50 border-gray-200' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col min-h-[600px] animate-in fade-in duration-500">
      <div className="p-10 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-6 bg-gray-50/50">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-3xl leading-none">history_edu</span>
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-primary-600/60 uppercase tracking-wider mb-1">Journal</h2>
            <h3 className="text-2xl font-bold text-gray-900 leading-none tracking-tight">Attendance Log</h3>
          </div>
        </div>
        <div className="flex bg-white px-6 py-2.5 rounded-lg border border-gray-200 shadow-sm items-center">
          <span className="text-xl font-bold text-primary-600 mr-3">{logs.length}</span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {logs.length === 1 ? 'Captured Record' : 'Captured Records'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-10">Subject & Group</th>
              <th className="p-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Classification</th>
              <th className="p-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Date</th>
              <th className="p-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Time</th>
              <th className="p-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right pr-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-40 text-center">
                  <div className="flex flex-col items-center gap-4 text-gray-300">
                    <span className="material-symbols-outlined text-6xl leading-none">folder_off</span>
                    <p className="font-bold uppercase text-xs tracking-widest">Registry Empty</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedLogs.map((log) => {
                const learner = learners.find(l => l.id === log.learnerId);
                const { label, color } = getLabelAndColor(log.type);
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6 pl-10">
                      <div className="text-sm font-bold text-gray-900">
                        {learner ? `${learner.last_name}, ${learner.first_name}` : 'Unknown Entity'}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
                          LRN: {learner?.lrn || 'INTERNAL'}
                        </div>
                        {learner && (
                          <div className="text-[10px] font-semibold text-primary-600/40 uppercase tracking-wider truncate">
                            {learner.grade_level} • {learner.section_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${color} shadow-sm`}>
                        {label}
                      </span>
                    </td>
                    <td className="p-6 text-center text-xs font-medium text-gray-500 font-mono">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="p-6 text-center text-sm font-bold text-gray-900 font-mono tabular-nums">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="p-6 text-right pr-10">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(log.id);
                        }}
                        className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-all"
                        title="Delete record"
                      >
                        <span className="material-symbols-outlined text-xl leading-none">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Record"
        message="Are you sure you want to permanently remove this attendance log? This action cannot be undone."
        confirmLabel="Delete Record"
      />
    </div>
  );
};

export default AttendanceLogs;
