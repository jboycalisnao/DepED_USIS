
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Learner, Section } from '../types';
import { supabase } from '@deped-usis/shared-supabase';
import { normalizeRfidValue } from '../utils/rfid';
import { loadLearnerRosterCache, saveLearnerRosterCache } from '../utils/learnerRosterCache';

export type RegisterLearnerPayload = {
  learnerId: string;
  rfid?: string;
};

export const useLearners = (selectedSchoolYearId: string) => {
  const [allLearners, setAllLearners] = useState<Learner[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [hasCachedRoster, setHasCachedRoster] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const syncLockRef = useRef(false);
  const sectionsCacheRef = useRef<Section[]>([]);

  const selectedSchoolYearKey = String(selectedSchoolYearId || '').trim();

  const enrichLearners = useCallback((rows: Learner[], sourceSections: Section[]) => {
    const sectionsMap = sourceSections.reduce((acc, section) => {
      acc[String(section.id)] = section;
      return acc;
    }, {} as Record<string, Section>);

    return rows.map((learner) => {
      const sId = String((learner as any).section_id || (learner as any).sectionId || '').trim();
      const section = sId ? sectionsMap[sId] : null;
      const gradeVal = section ? (section.grade_level || section.gradeLevel || 'General Education') : 'NO GRADE ASSIGNED';
      return {
        ...learner,
        section_name: section
          ? (section.name || 'Unknown Section')
          : (sId ? 'Unknown Section' : 'No Section Assigned'),
        grade_level: gradeVal,
      };
    });
  }, []);

  const visibleLearners = useMemo(() => {
    const enriched = enrichLearners(allLearners, sections);
    if (!selectedSchoolYearKey) return enriched;

    const sectionsMap = sections.reduce((acc, section) => {
      acc[String(section.id)] = section;
      return acc;
    }, {} as Record<string, Section>);

    return enriched.filter((learner) => {
      const sId = String((learner as any).section_id || (learner as any).sectionId || '').trim();
      if (!sId) return false;
      const section = sectionsMap[sId];
      const sectionSchoolYearId = String(section?.school_year_id || (section as any)?.schoolYearId || '').trim();
      return sectionSchoolYearId === selectedSchoolYearKey;
    });
  }, [allLearners, enrichLearners, sections, selectedSchoolYearKey]);

  const hydrateRosterCache = useCallback(async () => {
    try {
      const cached = await loadLearnerRosterCache();
      if (cached) {
        sectionsCacheRef.current = cached.sections || [];
        setSections(cached.sections || []);
        setAllLearners(cached.learners || []);
        setFetchedCount((cached.learners || []).length);
        setHasCachedRoster((cached.learners || []).length > 0);
        setLastSyncedAt(cached.updatedAt || '');
      }
    } catch (err) {
      console.error('Roster cache hydration error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchoolYearKey]);

  useEffect(() => {
    setFetchedCount(visibleLearners.length);
    setHasCachedRoster(allLearners.length > 0);
  }, [allLearners.length, visibleLearners.length]);

  useEffect(() => {
    void hydrateRosterCache();
  }, [hydrateRosterCache]);

  const fetchAll = useCallback(async () => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);
    setIsLoading(true);

    try {
      // 1. Fetch shared registrar section catalog first, then fallback to legacy sections table.
      const { data: registrarSectionsData, error: registrarSectionsError } = await supabase
        .from('registrar_sections')
        .select('*');

      let sectionsData: Section[] | null = registrarSectionsData as Section[] | null;

      if (registrarSectionsError) {
        const { data: fallbackSectionsData, error: fallbackSectionsError } = await supabase
          .from('sections')
          .select('*');
        if (fallbackSectionsError) throw fallbackSectionsError;
        sectionsData = fallbackSectionsData as Section[] | null;
      }

      const sectionsMap = (sectionsData || []).reduce((acc, s) => {
        acc[String(s.id)] = s;
        return acc;
      }, {} as Record<string, Section>);

      const { data, error } = await supabase
        .from('registrar_learners')
        .select('*')
        .order('last_name', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;

      sectionsCacheRef.current = sectionsData || [];
      setSections(sectionsData || []);
      setAllLearners(data || []);
      const enriched = enrichLearners((data || []) as Learner[], sectionsData || []);
      setFetchedCount(enriched.length);
      setHasCachedRoster(enriched.length > 0);
      setLastSyncedAt(new Date().toISOString());
      await saveLearnerRosterCache({
        learners: (data || []) as Learner[],
        sections: sectionsData || [],
      });
    } catch (err) {
      console.error('Data Fetching Error:', err);
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [enrichLearners]);

  const getFiltered = useCallback((query: string, uidMappings: Record<string, string>) => {
    const raw = query.trim().toLowerCase();
    if (!raw) return visibleLearners;

    const tokens = raw.split(/\s+/).filter(t => t.length > 0);
    
    return visibleLearners
      .map(l => {
        const first = (l.first_name || '').toLowerCase();
        const last = (l.last_name || '').toLowerCase();
        const lrn = (l.lrn || '').toLowerCase();
        const rfid = normalizeRfidValue(uidMappings[l.id] || l.rfid || '').toLowerCase();
        const section = (l.section_name || '').toLowerCase();
        const grade = (l.grade_level || '').toLowerCase();
        const full = `${first} ${last}`.toLowerCase();
        
        let score = 0;
        if (lrn === raw) score += 10000;
        if (rfid === raw) score += 9000;
        if (full.includes(raw)) score += 5000;

        const searchArea = `${full} ${lrn} ${rfid} ${section} ${grade}`;
        if (tokens.every(t => searchArea.includes(t))) {
          score += 500;
        }
        return { learner: l, score };
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(i => i.learner);
  }, [visibleLearners]);

  const saveLearnerRfid = useCallback(async (learnerId: string, rfid: string) => {
    const normalizedRfid = normalizeRfidValue(rfid);
    if (!learnerId || !normalizedRfid) return { ok: false as const, error: 'Learner and RFID are required.' };

    const { error } = await supabase
      .from('registrar_learners')
      .update({ rfid: normalizedRfid })
      .eq('id', learnerId);

    if (error) {
      return { ok: false as const, error: error.message || 'Failed to save learner RFID.' };
    }

    setAllLearners((prev) => {
      const nextLearners = prev.map((learner) => (learner.id === learnerId ? { ...learner, rfid: normalizedRfid } : learner));
      void saveLearnerRosterCache({
        learners: nextLearners,
        sections: sectionsCacheRef.current,
      });
      return nextLearners;
    });
    return { ok: true as const };
  }, []);

  const clearLearnerRfid = useCallback(async (learnerId: string) => {
    if (!learnerId) return { ok: false as const, error: 'Learner is required.' };

    const { error } = await supabase
      .from('registrar_learners')
      .update({ rfid: null })
      .eq('id', learnerId);

    if (error) {
      return { ok: false as const, error: error.message || 'Failed to clear learner RFID.' };
    }

    setAllLearners((prev) => {
      const nextLearners = prev.map((learner) => (learner.id === learnerId ? { ...learner, rfid: null } : learner));
      void saveLearnerRosterCache({
        learners: nextLearners,
        sections: sectionsCacheRef.current,
      });
      return nextLearners;
    });
    return { ok: true as const };
  }, []);

  const registerLearner = useCallback(async (payload: RegisterLearnerPayload) => {
    const learnerId = String(payload.learnerId || '').trim();
    const normalizedRfid = normalizeRfidValue(payload.rfid || '');
    if (!learnerId) return { ok: false as const, error: 'Learner is required.' };
    if (!normalizedRfid) return { ok: false as const, error: 'RFID reader value is required.' };

    const { error } = await supabase
      .from('registrar_learners')
      .update({ rfid: normalizedRfid })
      .eq('id', learnerId);

    if (error) {
      return { ok: false as const, error: error.message || 'Failed to register learner RFID.' };
    }

    setAllLearners((prev) => {
      const nextLearners = prev.map((learner) => (learner.id === learnerId ? { ...learner, rfid: normalizedRfid } : learner));
      void saveLearnerRosterCache({
        learners: nextLearners,
        sections: sectionsCacheRef.current,
      });
      return nextLearners;
    });

    return { ok: true as const };
  }, []);

  return {
    learners: visibleLearners,
    sections,
    isLoading,
    isSyncing,
    fetchedCount,
    getFiltered,
    saveLearnerRfid,
    clearLearnerRfid,
    registerLearner,
    loadLearners: fetchAll,
    hasCachedRoster,
    lastSyncedAt,
  };
};
