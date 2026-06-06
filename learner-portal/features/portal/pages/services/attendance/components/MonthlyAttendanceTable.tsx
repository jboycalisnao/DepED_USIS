import { LearnerAttendanceMonthRow, formatAttendanceTapType } from '../../../../services/attendanceService';

const DAY_HEADERS = Array.from({ length: 31 }, (_, index) => index + 1);

type MonthlyAttendanceTableProps = {
  months: LearnerAttendanceMonthRow[];
};

export function MonthlyAttendanceTable({ months }: MonthlyAttendanceTableProps) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
      <table className="w-full min-w-[1500px] text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600">Month</th>
            {DAY_HEADERS.map((day) => (
              <th key={day} className="px-3 py-3 text-[11px] font-semibold text-gray-600 text-center">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {months.length === 0 ? (
            <tr>
              <td colSpan={32} className="px-4 py-16 text-center text-[13px] text-gray-500">
                No consolidated attendance history yet.
              </td>
            </tr>
          ) : (
            months.map((month, index) => (
              <tr key={month.monthKey} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                <td className="sticky left-0 z-10 bg-inherit px-4 py-4 align-top">
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-gray-900">{month.monthLabel}</div>
                    <div className="text-[11px] text-gray-500">{month.monthKey}</div>
                  </div>
                </td>
                {month.days.map((day) => (
                  <td key={day.dateKey} className="px-2 py-3 align-top">
                    <div className="min-h-[7.5rem] rounded-md border border-gray-200 bg-white px-2 py-2 text-center">
                      <div className="text-[11px] font-semibold text-gray-500 mb-2">{day.day}</div>
                      {day.taps.length > 0 ? (
                        <div className="space-y-1 text-left">
                          {day.taps.map((tap) => (
                            <div key={`${day.dateKey}-${tap.type}-${tap.loggedAt}`} className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                  {formatAttendanceTapType(tap.type)}
                                </span>
                                <span className="text-[12px] font-bold text-gray-900 tabular-nums">{tap.displayTime}</span>
                              </div>
                            </div>
                          ))}
                          {day.unscheduledCount > 0 ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Unscheduled x{day.unscheduledCount}
                            </div>
                          ) : null}
                        </div>
                      ) : day.unscheduledCount > 0 ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700">
                          Unscheduled x{day.unscheduledCount}
                        </div>
                      ) : (
                        <div className="text-[12px] text-gray-300">-</div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

