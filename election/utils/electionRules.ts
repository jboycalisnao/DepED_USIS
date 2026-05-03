import { Position } from '../types';

const REGULAR_GRADE_REP_POSITIONS = new Set<Position>([
  Position.GRADE_7_REP,
  Position.GRADE_8_REP,
  Position.GRADE_9_REP,
  Position.GRADE_10_REP,
  Position.GRADE_11_REP,
  Position.GRADE_12_REP,
]);

export const isRegularGradeRepresentativePosition = (position: Position | string): boolean =>
  REGULAR_GRADE_REP_POSITIONS.has(position as Position);

export const isSingleSeatPosition = (position: Position | string): boolean =>
  !isRegularGradeRepresentativePosition(position);

export const getMaxSelectionsForPosition = (position: Position | string): number =>
  isRegularGradeRepresentativePosition(position) ? 2 : 1;

export const getWinnerSlotsForPosition = (position: Position | string): number =>
  getMaxSelectionsForPosition(position);

export const getPositionOutcomeLabel = (position: Position | string): string =>
  isRegularGradeRepresentativePosition(position)
    ? `Top ${getWinnerSlotsForPosition(position)} Winners for this Grade Level`
    : 'Official Candidate Performance';

export const sanitizeBallotSelections = (
  selections: Record<string, string[]>
): Record<string, string[]> => {
  const sanitized: Record<string, string[]> = {};

  Object.entries(selections).forEach(([position, ids]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }

    const limit = getMaxSelectionsForPosition(position);
    const uniqueIds = Array.from(
      new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))
    ).slice(0, limit);

    if (uniqueIds.length > 0) {
      sanitized[position] = uniqueIds;
    }
  });

  return sanitized;
};
