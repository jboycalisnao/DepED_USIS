import React, { useState } from 'react';
import { Student, User, Section } from '../../../types';

interface VoterCheckerProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
}

const VoterChecker: React.FC<VoterCheckerProps> = ({ learnerDatabase, voters, sections }) => {
  const [query, setQuery] = useState('');

  const filtered =
    query.length >= 3
      ? learnerDatabase
          .filter((learner) => {
            const fullName = `${learner.firstName} ${learner.lastName}`.toLowerCase();
            return learner.lrn.includes(query) || fullName.includes(query.toLowerCase());
          })
          .slice(0, 5)
      : [];

  return (
    <div className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-blue-50 text-[#034F8B]">
          <i className="fa-solid fa-user-check text-[16px]"></i>
        </div>
        <div>
          <h3 className="text-[16px] font-bold uppercase tracking-tight text-gray-900">
            Voter Status Checker
          </h3>
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Verify individual learner participation
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"></i>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter LRN or name to search"
          className="w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-[#fbfcff] py-[14px] pr-6 pl-12 text-[16px] text-[#12233d] outline-none transition-all duration-200 placeholder:text-[#98a2b3] focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)]"
        />
      </div>

      {query.length > 0 && query.length < 3 ? (
        <p className="text-center text-[13px] italic text-slate-500">
          Type at least 3 characters to search.
        </p>
      ) : null}

      <div className="space-y-3">
        {filtered.map((learner) => {
          const section = sections.find((entry) => entry.id === learner.sectionId);
          const hasVoted = voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted;

          return (
            <div
              key={learner.id}
              className="group flex items-center justify-between rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-4 shadow-sm transition-colors hover:border-[rgba(0,56,168,0.18)] hover:bg-slate-50"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-[12px] text-white ${
                    hasVoted ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${hasVoted ? 'fa-check' : 'fa-clock'}`}></i>
                </div>
                <div>
                  <h4 className="text-[16px] font-bold uppercase tracking-tight text-gray-900">
                    {learner.firstName} {learner.lastName}
                  </h4>
                  <p className="mt-1 text-[13px] text-slate-500">
                    LRN: {learner.lrn} | {section?.gradeLevel} - {section?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex rounded-[12px] border px-3 py-2 text-[13px] font-bold uppercase tracking-[0.08em] ${
                    hasVoted
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-blue-100 bg-blue-50 text-blue-600'
                  }`}
                >
                  {hasVoted ? 'Ballot Submitted' : 'Not Yet Voted'}
                </span>
              </div>
            </div>
          );
        })}

        {query.length >= 3 && filtered.length === 0 ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-user-slash mb-4 text-4xl text-gray-200"></i>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
              No matching learners found
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VoterChecker;
