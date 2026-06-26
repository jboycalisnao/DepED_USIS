export type LearnerAttendanceTapType = 'AM_IN' | 'AM_OUT' | 'PM_IN' | 'PM_OUT' | 'UNSCHEDULED';

export type AttendanceWindow = {
  start: string;
  end: string;
};

export type AttendanceGradeRules = {
  in: AttendanceWindow;
  out?: AttendanceWindow;
  lateAfter?: string;
};

export type AttendanceScheduleConfig = {
  grade7To10: {
    amIn: AttendanceGradeRules;
    amOut: AttendanceGradeRules;
    pmIn: AttendanceGradeRules;
    pmOut: AttendanceGradeRules;
  };
  grade11: {
    amIn: AttendanceGradeRules;
    amOut: AttendanceGradeRules;
  };
  grade12: {
    pmIn: AttendanceGradeRules;
    pmOut: AttendanceGradeRules;
  };
};

export type AttendanceDecision = {
  type: LearnerAttendanceTapType;
  isLate: boolean;
  gradeBand: 'grade7To10' | 'grade11' | 'grade12';
  range: string;
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = String(value || '')
    .split(':')
    .map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const isTimeBetween = (current: string, start: string, end: string) => {
  const currentMinutes = timeToMinutes(current);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (currentMinutes == null || startMinutes == null || endMinutes == null) return false;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const isAfterTime = (current: string, boundary: string) => {
  const currentMinutes = timeToMinutes(current);
  const boundaryMinutes = timeToMinutes(boundary);
  if (currentMinutes == null || boundaryMinutes == null) return false;
  return currentMinutes > boundaryMinutes;
};

const getTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const parseGradeNumber = (value: string) => {
  const match = String(value || '').match(/\b(1[0-2]|[7-9])\b/);
  if (!match) return null;
  return Number(match[1]);
};

const defaultRange = 'Database policy active';

export const DEFAULT_ATTENDANCE_SCHEDULE: AttendanceScheduleConfig = {
  grade7To10: {
    amIn: { in: { start: '05:00', end: '07:30' }, lateAfter: '07:30' },
    amOut: { in: { start: '11:30', end: '12:15' } },
    pmIn: { in: { start: '12:16', end: '13:00' }, lateAfter: '13:00' },
    pmOut: { in: { start: '17:00', end: '19:00' } },
  },
  grade11: {
    amIn: { in: { start: '05:00', end: '07:00' }, lateAfter: '07:00' },
    amOut: { in: { start: '12:00', end: '23:59' } },
  },
  grade12: {
    pmIn: { in: { start: '00:00', end: '12:00' }, lateAfter: '12:00' },
    pmOut: { in: { start: '17:00', end: '23:59' } },
  },
};

export const normalizeAttendanceSchedule = (schedule: Partial<AttendanceScheduleConfig> | null | undefined): AttendanceScheduleConfig => ({
  grade7To10: {
    amIn: {
      in: {
        start: schedule?.grade7To10?.amIn?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amIn.in.start,
        end: schedule?.grade7To10?.amIn?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amIn.in.end,
      },
      lateAfter: schedule?.grade7To10?.amIn?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amIn.lateAfter,
    },
    amOut: {
      in: {
        start: schedule?.grade7To10?.amOut?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amOut.in.start,
        end: schedule?.grade7To10?.amOut?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amOut.in.end,
      },
      lateAfter: schedule?.grade7To10?.amOut?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.amOut.lateAfter,
    },
    pmIn: {
      in: {
        start: schedule?.grade7To10?.pmIn?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmIn.in.start,
        end: schedule?.grade7To10?.pmIn?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmIn.in.end,
      },
      lateAfter: schedule?.grade7To10?.pmIn?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmIn.lateAfter,
    },
    pmOut: {
      in: {
        start: schedule?.grade7To10?.pmOut?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmOut.in.start,
        end: schedule?.grade7To10?.pmOut?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmOut.in.end,
      },
      lateAfter: schedule?.grade7To10?.pmOut?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10.pmOut.lateAfter,
    },
  },
  grade11: {
    amIn: {
      in: {
        start: schedule?.grade11?.amIn?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amIn.in.start,
        end: schedule?.grade11?.amIn?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amIn.in.end,
      },
      lateAfter: schedule?.grade11?.amIn?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amIn.lateAfter,
    },
    amOut: {
      in: {
        start: schedule?.grade11?.amOut?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amOut.in.start,
        end: schedule?.grade11?.amOut?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amOut.in.end,
      },
      lateAfter: schedule?.grade11?.amOut?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade11.amOut.lateAfter,
    },
  },
  grade12: {
    pmIn: {
      in: {
        start: schedule?.grade12?.pmIn?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmIn.in.start,
        end: schedule?.grade12?.pmIn?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmIn.in.end,
      },
      lateAfter: schedule?.grade12?.pmIn?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmIn.lateAfter,
    },
    pmOut: {
      in: {
        start: schedule?.grade12?.pmOut?.in?.start || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmOut.in.start,
        end: schedule?.grade12?.pmOut?.in?.end || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmOut.in.end,
      },
      lateAfter: schedule?.grade12?.pmOut?.lateAfter || DEFAULT_ATTENDANCE_SCHEDULE.grade12.pmOut.lateAfter,
    },
  },
});

export const normalizeGradeBand = (gradeLevel: string): AttendanceDecision['gradeBand'] => {
  const gradeNumber = parseGradeNumber(gradeLevel);
  if (gradeNumber === 11) return 'grade11';
  if (gradeNumber === 12) return 'grade12';
  return 'grade7To10';
};

const makeDecision = (
  gradeBand: AttendanceDecision['gradeBand'],
  type: LearnerAttendanceTapType,
  isLate: boolean,
  range: string,
): AttendanceDecision => ({
  gradeBand,
  type,
  isLate,
  range,
});

export const resolveAttendanceDecision = (
  gradeLevel: string,
  now: Date,
  schedule: AttendanceScheduleConfig = DEFAULT_ATTENDANCE_SCHEDULE,
): AttendanceDecision => {
  const time = getTimeString(now);
  const currentMinutes = timeToMinutes(time);
  const gradeBand = normalizeGradeBand(gradeLevel);

  if (gradeBand === 'grade11') {
    if (isTimeBetween(time, schedule.grade11.amIn.in.start, schedule.grade11.amIn.in.end)) {
      return makeDecision(gradeBand, 'AM_IN', false, `${schedule.grade11.amIn.in.start} - ${schedule.grade11.amIn.in.end}`);
    }

    if (isAfterTime(time, schedule.grade11.amIn.lateAfter || schedule.grade11.amIn.in.end)) {
      if (isTimeBetween(time, schedule.grade11.amOut.in.start, schedule.grade11.amOut.in.end)) {
        return makeDecision(gradeBand, 'AM_OUT', false, `${schedule.grade11.amOut.in.start} onwards`);
      }
      return makeDecision(gradeBand, 'AM_IN', true, `${schedule.grade11.amIn.lateAfter || schedule.grade11.amIn.in.end} onwards`);
    }

    if (isTimeBetween(time, schedule.grade11.amOut.in.start, schedule.grade11.amOut.in.end)) {
      return makeDecision(gradeBand, 'AM_OUT', false, `${schedule.grade11.amOut.in.start} onwards`);
    }

    return makeDecision(gradeBand, 'UNSCHEDULED', false, defaultRange);
  }

  if (gradeBand === 'grade12') {
    if (isTimeBetween(time, schedule.grade12.pmOut.in.start, schedule.grade12.pmOut.in.end)) {
      return makeDecision(gradeBand, 'PM_OUT', false, `${schedule.grade12.pmOut.in.start} - ${schedule.grade12.pmOut.in.end}`);
    }

    if (isTimeBetween(time, schedule.grade12.pmIn.in.start, schedule.grade12.pmIn.in.end)) {
      const isLate = isAfterTime(time, schedule.grade12.pmIn.lateAfter || schedule.grade12.pmIn.in.end);
      return makeDecision(
        gradeBand,
        'PM_IN',
        isLate,
        isLate ? `${schedule.grade12.pmIn.lateAfter || schedule.grade12.pmIn.in.end} onwards` : `${schedule.grade12.pmIn.in.start} - ${schedule.grade12.pmIn.in.end}`,
      );
    }

    if (isAfterTime(time, schedule.grade12.pmIn.lateAfter || schedule.grade12.pmIn.in.end) && !isTimeBetween(time, schedule.grade12.pmOut.in.start, schedule.grade12.pmOut.in.end)) {
      return makeDecision(gradeBand, 'PM_IN', true, `${schedule.grade12.pmIn.lateAfter || schedule.grade12.pmIn.in.end} onwards`);
    }

    return makeDecision(gradeBand, 'PM_IN', false, `${schedule.grade12.pmIn.in.start} - ${schedule.grade12.pmIn.in.end}`);
  }

  if (isTimeBetween(time, schedule.grade7To10.amOut.in.start, schedule.grade7To10.amOut.in.end)) {
    return makeDecision(gradeBand, 'AM_OUT', false, `${schedule.grade7To10.amOut.in.start} - ${schedule.grade7To10.amOut.in.end}`);
  }

  if (isTimeBetween(time, schedule.grade7To10.pmOut.in.start, schedule.grade7To10.pmOut.in.end)) {
    return makeDecision(gradeBand, 'PM_OUT', false, `${schedule.grade7To10.pmOut.in.start} - ${schedule.grade7To10.pmOut.in.end}`);
  }

  if (isTimeBetween(time, schedule.grade7To10.amIn.in.start, schedule.grade7To10.amIn.in.end)) {
    return makeDecision(gradeBand, 'AM_IN', false, `${schedule.grade7To10.amIn.in.start} - ${schedule.grade7To10.amIn.in.end}`);
  }

  if (
    isAfterTime(time, schedule.grade7To10.amIn.lateAfter || schedule.grade7To10.amIn.in.end) &&
    currentMinutes != null &&
    timeToMinutes(schedule.grade7To10.amOut.in.start) != null &&
    currentMinutes < timeToMinutes(schedule.grade7To10.amOut.in.start)!
  ) {
    return makeDecision(gradeBand, 'AM_IN', true, `${schedule.grade7To10.amIn.lateAfter || schedule.grade7To10.amIn.in.end} onwards`);
  }

  if (isTimeBetween(time, schedule.grade7To10.pmIn.in.start, schedule.grade7To10.pmIn.in.end)) {
    return makeDecision(
      gradeBand,
      'PM_IN',
      isAfterTime(time, schedule.grade7To10.pmIn.lateAfter || schedule.grade7To10.pmIn.in.end),
      isAfterTime(time, schedule.grade7To10.pmIn.lateAfter || schedule.grade7To10.pmIn.in.end)
        ? `${schedule.grade7To10.pmIn.lateAfter || schedule.grade7To10.pmIn.in.end} onwards`
        : `${schedule.grade7To10.pmIn.in.start} - ${schedule.grade7To10.pmIn.in.end}`,
    );
  }

  if (isAfterTime(time, schedule.grade7To10.pmIn.lateAfter || schedule.grade7To10.pmIn.in.end) && !isTimeBetween(time, schedule.grade7To10.pmOut.in.start, schedule.grade7To10.pmOut.in.end)) {
    return makeDecision(gradeBand, 'PM_IN', true, `${schedule.grade7To10.pmIn.lateAfter || schedule.grade7To10.pmIn.in.end} onwards`);
  }

  return makeDecision(gradeBand, 'UNSCHEDULED', false, defaultRange);
};
