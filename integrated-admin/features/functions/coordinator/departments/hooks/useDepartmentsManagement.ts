import { useEffect, useState } from 'react';
import { activateDepartment, deactivateDepartment, deleteDepartment, loadDepartments, saveDepartment, type DepartmentRecord } from '../services/departmentsService';

type AlertState = { message: string; title: string; tone: 'success' | 'danger' | 'info' } | null;

export function useDepartmentsManagement() {
  const [rows, setRows] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);
  const [name, setName] = useState('');
  const [alert, setAlert] = useState<AlertState>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setRows(await loadDepartments());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditing({ id: '', isActive: true, name: '' });
    setName('');
  };

  const openEdit = (row: DepartmentRecord) => {
    setEditing(row);
    setName(row.name);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setEditing(null);
  };

  const submitForm = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      await saveDepartment({ id: editing.id || undefined, name });
      setEditing(null);
      await refresh();
      setAlert({
        title: editing.id ? 'Department Updated' : 'Department Created',
        message: 'Department saved successfully.',
        tone: 'success',
      });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to save department.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deactivateDepartment(id);
      await refresh();
      setAlert({ title: 'Department Deactivated', message: 'Department was deactivated successfully.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Action Failed', message: error?.message || 'Unable to deactivate department.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activate = async (id: string) => {
    setIsSubmitting(true);
    try {
      await activateDepartment(id);
      await refresh();
      setAlert({ title: 'Department Activated', message: 'Department was activated successfully.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Action Failed', message: error?.message || 'Unable to activate department.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteDepartment(id);
      await refresh();
      setAlert({ title: 'Department Deleted', message: 'Department was deleted successfully.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete department.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    alert,
    activate,
    closeForm,
    deactivate,
    editing,
    isLoading,
    isSubmitting,
    name,
    openCreate,
    openEdit,
    remove,
    rows,
    setAlert,
    setName,
    submitForm,
  };
}
