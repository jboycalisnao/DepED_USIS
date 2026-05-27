import { useEffect, useMemo, useState } from 'react';
import {
  deleteSubjectManagementRecord,
  loadShsStrands,
  loadSubjectManagementRecords,
  saveSubjectManagementRecord,
  type ProgramScope,
  type SaveSubjectManagementInput,
  type SubjectManagementRecord,
} from '../services/subjectManagementService';

export function useSubjectManagement() {
  const [rows, setRows] = useState<SubjectManagementRecord[]>([]);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | ProgramScope>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [strands, setStrands] = useState<Array<{ label: string; value: string }>>([]);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [subjects, shsStrands] = await Promise.all([
        loadSubjectManagementRecords(),
        loadShsStrands(),
      ]);
      setRows(subjects);
      setStrands(shsStrands);
      setError('');
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to load subject management data.');
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
      if (scopeFilter !== 'all' && row.programScope !== scopeFilter) return false;
      if (!normalized) return true;
      return (
        row.subjectCode.toLowerCase().includes(normalized) ||
        row.subjectTitle.toLowerCase().includes(normalized) ||
        row.gradeLevel.toLowerCase().includes(normalized) ||
        row.programScope.toLowerCase().includes(normalized) ||
        row.subjectType.toLowerCase().includes(normalized) ||
        row.strand.toLowerCase().includes(normalized)
      );
    });
  }, [query, rows, scopeFilter]);

  const save = async (payload: SaveSubjectManagementInput) => {
    setIsSubmitting(true);
    try {
      await saveSubjectManagementRecord(payload);
      setNotice(payload.id ? 'Subject updated successfully.' : 'Subject created successfully.');
      setError('');
      await refresh();
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to save subject.');
      throw nextError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteSubjectManagementRecord(id);
      setNotice('Subject deleted successfully.');
      setError('');
      await refresh();
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to delete subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    error,
    filteredRows,
    isLoading,
    isSubmitting,
    notice,
    query,
    refresh,
    remove,
    rows,
    save,
    scopeFilter,
    setNotice,
    setQuery,
    setScopeFilter,
    strands,
  };
}

