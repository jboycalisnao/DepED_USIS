import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Student, User, Section, GradeLevel, ElectionConfig } from '../types';

interface PublicTurnoutProps {
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
  config: ElectionConfig;
  schoolYearLabel: string;
}

const shellWidthClass = 'mx-auto w-[min(1180px,calc(100%-32px))] px-[28px]';

const PublicTurnout: React.FC<PublicTurnoutProps> = ({
  voters,
  learnerDatabase,
  sections,
  config,
  schoolYearLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const eligibleLearners = useMemo(
    () =>
      learnerDatabase.filter((learner) => {
        const section = sections.find((item) => item.id === learner.sectionId);
        return section?.gradeLevel !== GradeLevel.GRADE_12;
      }),
    [learnerDatabase, sections],
  );

  const votedLrnSet = useMemo(
    () => new Set(voters.filter((voter) => voter.hasVoted).map((voter) => voter.studentId)),
    [voters],
  );

  const totalVoted = votedLrnSet.size;
  const totalEligible = eligibleLearners.length;
  const globalTurnout = totalEligible > 0 ? ((totalVoted / totalEligible) * 100).toFixed(1) : '0.0';

  const gradeLevelBreakdown = useMemo(() => {
    return Object.values(GradeLevel)
      .filter((grade) => grade !== GradeLevel.GRADE_12)
      .map((grade) => {
        const gradeSections = sections.filter((section) => section.gradeLevel === grade);

        const sectionDetails = gradeSections
          .map((section) => {
            const sectionLearners = eligibleLearners.filter((learner) => learner.sectionId === section.id);
            const sectionVotedCount = sectionLearners.filter((learner) =>
              votedLrnSet.has(learner.lrn),
            ).length;
            const percentage =
              sectionLearners.length > 0 ? (sectionVotedCount / sectionLearners.length) * 100 : 0;

            return {
              ...section,
              percentage,
              total: sectionLearners.length,
              voted: sectionVotedCount,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        const gradeVoted = sectionDetails.reduce((sum, section) => sum + section.voted, 0);
        const gradeTotal = sectionDetails.reduce((sum, section) => sum + section.total, 0);

        return {
          grade,
          gradePercentage: gradeTotal > 0 ? (gradeVoted / gradeTotal) * 100 : 0,
          gradeTotal,
          gradeVoted,
          sections: sectionDetails,
        };
      })
      .filter((grade) => grade.sections.length > 0);
  }, [eligibleLearners, sections, votedLrnSet]);

  const filteredBreakdown = useMemo(() => {
    if (!searchQuery.trim()) return gradeLevelBreakdown;
    const term = searchQuery.toLowerCase().trim();

    return gradeLevelBreakdown
      .map((grade) => ({
        ...grade,
        sections: grade.sections.filter(
          (section) =>
            section.name.toLowerCase().includes(term) ||
            section.adviserName.toLowerCase().includes(term),
        ),
      }))
      .filter((grade) => grade.sections.length > 0);
  }, [gradeLevelBreakdown, searchQuery]);

  const genderData = useMemo(() => {
    const normalize = (gender: string) =>
      (gender || '').toUpperCase().startsWith('M')
        ? 'Male'
        : (gender || '').toUpperCase().startsWith('F')
          ? 'Female'
          : 'Unclassified';

    const votedLearners = eligibleLearners.filter((learner) => votedLrnSet.has(learner.lrn));
    const counts = { Female: 0, Male: 0, Unclassified: 0 };

    votedLearners.forEach((learner) => {
      const gender = normalize(learner.gender || (learner as any).GENDER);
      counts[gender as keyof typeof counts] += 1;
    });

    return [
      { fill: '#034F8B', name: 'Male voters', value: counts.Male },
      { fill: '#E11C38', name: 'Female voters', value: counts.Female },
      { fill: '#64748b', name: 'Unclassified', value: counts.Unclassified },
    ].filter((item) => item.value > 0);
  }, [eligibleLearners, votedLrnSet]);

  const gradeChartData = useMemo(
    () =>
      gradeLevelBreakdown.map((grade) => ({
        name: grade.grade,
        turnout: Number(grade.gradePercentage.toFixed(1)),
      })),
    [gradeLevelBreakdown],
  );

  return (
    <section className={`${shellWidthClass} py-10`}>
      <div className="rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Public Turnout
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[24px] font-black uppercase text-[#034F8B]">
              Participation Dashboard
            </h1>
            <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
              {config.schoolName || 'Leon National High School'} • SY {schoolYearLabel}
            </p>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Current turnout
            </p>
            <p className="mt-1 text-[24px] font-black text-[#034F8B]">{globalTurnout}%</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-[24px] font-black uppercase text-[#034F8B]">
            Turnout by Grade Level
          </h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-slate-500">
            Live aggregate turnout across eligible grade levels.
          </p>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeChartData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar barSize={42} dataKey="turnout" radius={[8, 8, 0, 0]}>
                  {gradeChartData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={index % 2 === 0 ? '#034F8B' : '#E11C38'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-[24px] font-black uppercase text-[#034F8B]">Voter Profile</h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-slate-500">
            Aggregate participation data only. No individual ballots are shown.
          </p>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={genderData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: '13px', fontWeight: 700, paddingTop: '16px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Section Participation Registry
            </p>
            <h2 className="mt-2 text-[24px] font-black uppercase text-[#034F8B]">
              Section Participation Registry
            </h2>
          </div>
          <div className="w-full md:max-w-[320px]">
            <label
              className="mb-2 block text-[13px] font-bold uppercase tracking-[0.16em] text-slate-500"
              htmlFor="turnout-search"
            >
              Search section or adviser
            </label>
            <input
              id="turnout-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Enter section or adviser"
              className="h-12 w-full rounded-[12px] border border-slate-200 bg-white px-4 text-[16px] text-slate-900 outline-none transition focus:border-[#034F8B]"
            />
          </div>
        </div>

        <div className="px-6 py-6">
          {filteredBreakdown.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-[16px] font-bold text-slate-600">No sections match your search.</p>
              <button
                className="mt-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#034F8B]"
                onClick={() => setSearchQuery('')}
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredBreakdown.map((grade) => (
                <section key={grade.grade}>
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-[24px] font-black uppercase text-[#034F8B]">
                        {grade.grade}
                      </h3>
                      <p className="mt-1 text-[13px] leading-[1.5] text-slate-500">
                        {grade.gradeVoted} of {grade.gradeTotal} eligible learners have voted.
                      </p>
                    </div>
                    <p className="text-[24px] font-black text-[#034F8B]">
                      {grade.gradePercentage.toFixed(1)}%
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {grade.sections.map((section) => (
                      <article
                        key={section.id}
                        className="rounded-[12px] border border-slate-200 bg-white px-4 py-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-[16px] font-bold text-slate-900">{section.name}</h4>
                            <p className="mt-1 text-[13px] text-slate-500">
                              {section.adviserName || 'No adviser listed'}
                            </p>
                          </div>
                          <span className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold text-slate-600">
                            {section.percentage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[13px] text-slate-500">
                            <span>Class turnout</span>
                            <span>
                              {section.voted} / {section.total}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full ${
                                section.percentage >= 100
                                  ? 'bg-green-500'
                                  : section.percentage >= 50
                                    ? 'bg-[#034F8B]'
                                    : 'bg-[#E11C38]'
                              }`}
                              style={{ width: `${section.percentage}%` }}
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PublicTurnout;
