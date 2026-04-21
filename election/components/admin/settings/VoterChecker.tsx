
import React, { useState } from 'react';
import { Student, User, Section } from '../../../types';

interface VoterCheckerProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
}

const VoterChecker: React.FC<VoterCheckerProps> = ({ learnerDatabase, voters, sections }) => {
  const [query, setQuery] = useState('');

  const filtered = query.length >= 3 
    ? learnerDatabase.filter(l => {
        const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
        return l.lrn.includes(query) || fullName.includes(query.toLowerCase());
      }).slice(0, 5)
    : [];

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#034F8B]">
          <i className="fa-solid fa-user-check text-xl"></i>
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Voter Status Checker</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verify individual learner participation</p>
        </div>
      </div>

      <div className="relative mb-6">
        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ENTER LRN OR NAME TO SEARCH..."
          className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#034F8B] outline-none transition-all font-bold text-sm uppercase tracking-widest"
        />
      </div>

      {query.length > 0 && query.length < 3 && (
        <p className="text-[10px] text-gray-400 font-bold uppercase text-center italic">Type at least 3 characters to search...</p>
      )}

      <div className="space-y-3">
        {filtered.map(learner => {
          const section = sections.find(s => s.id === learner.sectionId);
          const hasVoted = voters.find(v => v.studentId === learner.lrn)?.hasVoted;

          return (
            <div key={learner.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex justify-between items-center group hover:bg-white hover:border-[#034F8B]/30 transition-all">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${hasVoted ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <i className={`fa-solid ${hasVoted ? 'fa-check' : 'fa-clock'}`}></i>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-tight">{learner.firstName} {learner.lastName}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    LRN: {learner.lrn} • {section?.gradeLevel} - {section?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${hasVoted ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-400 border border-blue-100'}`}>
                  {hasVoted ? 'BALLOT SUBMITTED' : 'NOT YET VOTED'}
                </span>
              </div>
            </div>
          );
        })}
        {query.length >= 3 && filtered.length === 0 && (
          <div className="text-center py-10">
            <i className="fa-solid fa-user-slash text-4xl text-gray-200 mb-4"></i>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching learners found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterChecker;