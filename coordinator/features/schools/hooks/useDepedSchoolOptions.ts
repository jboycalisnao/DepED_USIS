import { useEffect, useMemo, useState } from 'react';
import type { SearchableSelectOption } from '@/features/shared/components/SearchableSelect';
import type { RegistrySchoolContext } from '@/features/access/utils/credentialRegistry';
import { fetchDepedSchools } from '../services/depedSchoolApi';

export function useDepedSchoolOptions(
  scopedSchools: RegistrySchoolContext[],
  preferredRegion?: string,
) {
  const [apiOptions, setApiOptions] = useState<SearchableSelectOption[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const records = await fetchDepedSchools({
          limit: query.trim().length >= 3 ? 100 : 200,
          order: 'asc',
          page: 1,
          region: preferredRegion || undefined,
          search: query.trim() || undefined,
          sort: 'school_name',
        });
        if (disposed) return;
        const unique = new Map<string, string>();
        for (const school of records) {
          if (!school.schoolId || !school.schoolName) continue;
          unique.set(school.schoolId, `${school.schoolId} - ${school.schoolName}`);
        }
        setApiOptions(Array.from(unique.entries()).map(([value, label]) => ({ label, value })));
      } catch {
        if (!disposed) setApiOptions([]);
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [preferredRegion, query]);

  const options = useMemo(() => {
    const databaseOptions = scopedSchools.map((entry) => ({
      label: `${entry.schoolCode} - ${entry.schoolName}`,
      value: entry.schoolCode,
    }));

    if (!apiOptions.length) return databaseOptions;

    const existingValues = new Set(databaseOptions.map((o) => o.value));
    const merged = [...databaseOptions];

    for (const option of apiOptions) {
      if (!existingValues.has(option.value)) {
        merged.push(option);
      }
    }

    return merged;
  }, [apiOptions, scopedSchools]);

  return { options, setQuery, isLoading };
}
