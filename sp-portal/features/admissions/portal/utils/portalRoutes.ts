export function normalizeRoutePart(value: string | undefined) {
  return (value || '').trim().toLowerCase();
}

export function hasCompletePortalRoute(
  regionSlug: string | undefined,
  divisionSlug: string | undefined,
  schoolId: string | undefined,
) {
  return Boolean(normalizeRoutePart(regionSlug) && normalizeRoutePart(divisionSlug) && schoolId?.trim());
}
