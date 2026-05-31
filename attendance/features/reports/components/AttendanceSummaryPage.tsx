import { useMemo, useState } from 'react';
import { AttendanceMonthlySummaryRow, AttendanceWeeklySummaryRow } from '../../../types';

interface AttendanceSummaryPageProps {
  onQuerySummaryRange: (
    fromDate: string,
    toDate: string,
  ) => Promise<{ weekly: AttendanceWeeklySummaryRow[]; monthly: AttendanceMonthlySummaryRow[] }>;
}

const todayIso = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, '0');
  const dd = `${now.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const AttendanceSummaryPage = ({ onQuerySummaryRange }: AttendanceSummaryPageProps) => {
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 30);
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [toDate, setToDate] = useState(() => todayIso());
  const [loading, setLoading] = useState(false);
  const [weekly, setWeekly] = useState<AttendanceWeeklySummaryRow[]>([]);
  const [monthly, setMonthly] = useState<AttendanceMonthlySummaryRow[]>([]);

  const totals = useMemo(() => {
    const expected = weekly.reduce((sum, row) => sum + row.expectedSlots, 0);
    const present = weekly.reduce((sum, row) => sum + row.presentSlots, 0);
    const missing = weekly.reduce((sum, row) => sum + row.missingSlots, 0);
    const rate = expected > 0 ? Math.round((present / expected) * 100) : 0;
    return { expected, present, missing, rate };
  }, [weekly]);

  const load = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const result = await onQuerySummaryRange(fromDate, toDate);
      setWeekly(result.weekly);
      setMonthly(result.monthly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-[24px] font-bold text-gray-900">Attendance Summary</h2>
        <p className="text-[13px] text-gray-600 mt-1">Weekly and monthly attendance analytics.</p>
        <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-gray-600">
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-md border border-gray-200 px-3 bg-white text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-gray-600">
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-md border border-gray-200 px-3 bg-white text-[13px]"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !fromDate || !toDate}
            className="h-10 px-4 rounded-md border border-primary-600 bg-primary-600 text-white text-[12px] font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Summary'}
          </button>
        </div>
      </div>

      <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-200 bg-white">
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[12px] text-gray-500">Expected Slots</p>
          <p className="text-[18px] font-bold text-gray-900">{totals.expected}</p>
        </div>
        <div className="rounded-md border border-success-200 bg-success-50 px-4 py-3">
          <p className="text-[12px] text-success-700">Present Slots</p>
          <p className="text-[18px] font-bold text-success-700">{totals.present}</p>
        </div>
        <div className="rounded-md border border-accent-200 bg-accent-50 px-4 py-3">
          <p className="text-[12px] text-accent-700">Missing Slots</p>
          <p className="text-[18px] font-bold text-accent-700">{totals.missing}</p>
        </div>
        <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-3">
          <p className="text-[12px] text-primary-700">Attendance Rate</p>
          <p className="text-[18px] font-bold text-primary-700">{totals.rate}%</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-3">Weekly Summary</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Week Start</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Section</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Grade</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Expected</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Present</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weekly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-gray-500">No weekly summary data.</td>
                  </tr>
                ) : (
                  weekly.map((row, index) => (
                    <tr key={`${row.weekStart}-${row.sectionName}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{row.weekStart}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">{row.sectionName}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{row.gradeLevel}</td>
                      <td className="px-4 py-3 text-[13px] text-right">{row.expectedSlots}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-success-700 font-semibold">{row.presentSlots}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-accent-700 font-semibold">{row.missingSlots}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-3">Monthly Summary</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Month</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Section</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600">Grade</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Expected</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Present</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 text-right">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-gray-500">No monthly summary data.</td>
                  </tr>
                ) : (
                  monthly.map((row, index) => (
                    <tr key={`${row.summaryMonth}-${row.sectionName}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{row.summaryMonth}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">{row.sectionName}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{row.gradeLevel}</td>
                      <td className="px-4 py-3 text-[13px] text-right">{row.expectedSlots}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-success-700 font-semibold">{row.presentSlots}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-accent-700 font-semibold">{row.missingSlots}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AttendanceSummaryPage;
