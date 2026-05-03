import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@deped-usis/shared-supabase';
import { demoAdmissionPortals } from '../data/demoPortal';
import type { AdmissionPortal } from '../types';
import { hasCompletePortalRoute, normalizeRoutePart } from '../utils/portalRoutes';

type LoadState = {
  isLoading: boolean;
  portal: AdmissionPortal | null;
  error: string | null;
};

type PortalRecord = Partial<AdmissionPortal> & {
  school_name?: string;
  school_id?: string;
  region_name?: string;
  region_slug?: string;
  division_name?: string;
  division_slug?: string;
  hero_copy?: string;
  application_url?: string;
};

function mapPortalRecord(record: PortalRecord): AdmissionPortal {
  return {
    id: String(record.id || record.school_id || 'sp-portal'),
    schoolName: String(record.schoolName || record.school_name || ''),
    schoolId: String(record.schoolId || record.school_id || ''),
    regionName: String(record.regionName || record.region_name || ''),
    regionSlug: String(record.regionSlug || record.region_slug || ''),
    divisionName: String(record.divisionName || record.division_name || ''),
    divisionSlug: String(record.divisionSlug || record.division_slug || ''),
    status: record.status || 'inactive',
    heroCopy: String(record.heroCopy || record.hero_copy || ''),
    timeline: record.timeline || {
      applicationPeriod: 'For announcement',
      entranceExamination: 'For announcement',
      resultsPosting: 'For announcement',
    },
    bulletins: record.bulletins || [],
    offerings: record.offerings || [],
    requirements: record.requirements || [],
    contact: record.contact || {
      office: 'Admissions Office',
      email: 'For announcement',
      phone: 'For announcement',
      officeHours: 'For announcement',
      address: 'For announcement',
    },
    applicationUrl: record.applicationUrl || record.application_url,
  };
}

export function useAdmissionPortal(
  regionSlug: string | undefined,
  divisionSlug: string | undefined,
  schoolId: string | undefined,
) {
  const routeKey = useMemo(
    () => ({
      regionSlug: normalizeRoutePart(regionSlug),
      divisionSlug: normalizeRoutePart(divisionSlug),
      schoolId: schoolId?.trim() || '',
    }),
    [divisionSlug, regionSlug, schoolId],
  );
  const [state, setState] = useState<LoadState>({ isLoading: true, portal: null, error: null });

  useEffect(() => {
    let isMounted = true;

    async function loadPortal() {
      if (!hasCompletePortalRoute(routeKey.regionSlug, routeKey.divisionSlug, routeKey.schoolId)) {
        setState({ isLoading: false, portal: null, error: null });
        return;
      }

      setState({ isLoading: true, portal: null, error: null });

      const demoPortal = demoAdmissionPortals.find(
        (portal) =>
          portal.regionSlug === routeKey.regionSlug &&
          portal.divisionSlug === routeKey.divisionSlug &&
          portal.schoolId === routeKey.schoolId,
      );

      const { data, error } = await supabase
        .from('sp_portal_school_portals')
        .select('*')
        .eq('region_slug', routeKey.regionSlug)
        .eq('division_slug', routeKey.divisionSlug)
        .eq('school_id', routeKey.schoolId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (data) {
        setState({ isLoading: false, portal: mapPortalRecord(data as PortalRecord), error: null });
        return;
      }

      if (demoPortal) {
        setState({
          isLoading: false,
          portal: demoPortal,
          error: error ? 'Using local sample data while SP Portal tables are unavailable.' : null,
        });
        return;
      }

      setState({ isLoading: false, portal: null, error: error?.message || null });
    }

    void loadPortal();

    return () => {
      isMounted = false;
    };
  }, [routeKey.divisionSlug, routeKey.regionSlug, routeKey.schoolId]);

  return state;
}
