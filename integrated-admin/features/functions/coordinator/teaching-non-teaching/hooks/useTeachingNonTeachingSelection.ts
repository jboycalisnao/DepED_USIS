import { useEffect, useMemo, useState } from 'react';
import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

export function useTeachingNonTeachingSelection(rows: TeachingNonTeachingCredentialRecord[]) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedAccountIds.length === 0) return;
    const validIds = new Set(rows.map((row) => row.id));
    setSelectedAccountIds((current) => current.filter((id) => validIds.has(id)));
  }, [rows, selectedAccountIds.length]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedAccountIds.includes(row.id)),
    [rows, selectedAccountIds],
  );

  const toggleSelected = (id: string) => {
    setSelectedAccountIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const toggleManySelected = (ids: string[], selected: boolean) => {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => {
        if (selected) next.add(id);
        else next.delete(id);
      });
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelectedAccountIds([]);

  return {
    clearSelection,
    selectedAccountIds,
    selectedRows,
    setSelectedAccountIds,
    toggleManySelected,
    toggleSelected,
  };
}
