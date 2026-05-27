import { useEffect, useMemo, useState } from 'react';
import type { ManagedSection, SectionTrack } from '../services/subjectsManagementService';
import { loadManagedSections } from '../services/subjectsManagementService';

export function useSubjectsManagement() {
  const [rows, setRows] = useState<ManagedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState<'all' | SectionTrack>('all');

  const refresh = async () => {
    setIsLoading(true);
    try {
      setRows(await loadManagedSections());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const trackMatch = trackFilter === 'all' || row.track === trackFilter;
      const searchMatch = !normalized ||
        row.name.toLowerCase().includes(normalized) ||
        row.gradeLevel.toLowerCase().includes(normalized) ||
        row.strand.toLowerCase().includes(normalized) ||
        row.specialProgram.toLowerCase().includes(normalized);
      return trackMatch && searchMatch;
    });
  }, [query, rows, trackFilter]);

  return {
    filteredRows,
    isLoading,
    query,
    refresh,
    rows,
    setQuery,
    setTrackFilter,
    trackFilter,
  };
}
