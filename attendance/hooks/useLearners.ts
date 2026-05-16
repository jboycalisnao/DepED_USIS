
import { useState, useEffect, useCallback } from 'react';
import { Learner, Section } from '../types';
import { supabase } from '../lib/supabase';
import { normalizeRfidValue } from '../utils/rfid';

export const useLearners = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);

  const fetchAll = useCallback(async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      
      // 1. Fetch ALL Sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*');
      
      if (sectionsError) throw sectionsError;
      
      const sectionsMap = (sectionsData as Section[]).reduce((acc, s) => {
        acc[String(s.id)] = s;
        return acc;
      }, {} as Record<string, Section>);

      // 2. Fetch Learners in chunks
      let allData: Learner[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        // FIX: Added .order('id') as a secondary sort key. 
        // Without this, pagination is non-deterministic for rows with identical last names,
        // causing records to be skipped or duplicated between the 'from' ranges.
        const { data, error } = await supabase
          .from('learners')
          .select('*')
          .range(from, from + step - 1)
          .order('last_name', { ascending: true })
          .order('id', { ascending: true });
        
        if (error) throw error;

        if (data && data.length > 0) {
          const enriched = data.map(l => {
            const sId = (l as any).section_id;
            const section = sId ? sectionsMap[String(sId)] : null;
            
            // Priority: 1. grade_level 2. gradeLevel 3. Default
            const gradeVal = section ? (section.grade_level || section.gradeLevel || 'General Education') : 'NO GRADE ASSIGNED';
            
            return {
              ...l,
              section_name: section ? section.name : (sId ? 'Unknown Section' : 'No Section Assigned'),
              grade_level: gradeVal
            };
          });

          // Deduplication check: logic to ensure we don't count the same ID twice
          // even if the DB returns it in different ranges due to unstable sorting.
          const currentIds = new Set(allData.map(l => l.id));
          const unique = enriched.filter(l => {
            if (currentIds.has(l.id)) {
              console.warn(`Duplicate learner ID detected during fetch: ${l.id}. Skipping to maintain count integrity.`);
              return false;
            }
            return true;
          });
          
          allData = [...allData, ...unique];
          setLearners([...allData]); 
          setFetchedCount(allData.length);
          setIsLoading(false);
          
          hasMore = data.length === step;
          from += step;

          // Performance throttle
          await new Promise(resolve => setTimeout(resolve, 30));
        } else {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error('Data Fetching Error:', err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [isSyncing]);

  useEffect(() => { fetchAll(); }, []);

  const getFiltered = useCallback((query: string, uidMappings: Record<string, string>) => {
    const raw = query.trim().toLowerCase();
    if (!raw) return learners;

    const tokens = raw.split(/\s+/).filter(t => t.length > 0);
    
    return learners
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
  }, [learners]);

  return { learners, isLoading, isSyncing, fetchedCount, getFiltered };
};
