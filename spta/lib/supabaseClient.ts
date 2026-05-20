import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CONFIG, LOCAL_FALLBACK_USER } from '../config/systemDefaults';

// --- DATABASE 1: LEARNER DATABASE (Read Only) ---
// Contains: learners, sections
const LEARNER_DB_URL = 'https://vubmvthbsnzzhmjbdces.supabase.co';
const LEARNER_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Ym12dGhic256emhtamJkY2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTIwMTMsImV4cCI6MjA4MDY4ODAxM30.woE4szCZ6PAbTU54Rf5b9oqr5QPS9aaBh_qRmLJ3B8k';

type QueryResult<T = any> = { data: T | null; error: { message: string } | null };
type Filter = { column: string; value: any };
type StoredTables = Record<string, any[]>;

const APP_DB_STORAGE_KEY = 'pta_app_db';

const defaultAppDb = (): StoredTables => ({
  financial_transactions: [],
  system_config: [{ id: 1, config: DEFAULT_CONFIG }],
  app_users: [{ ...LOCAL_FALLBACK_USER }],
  activities: [],
  resolutions: [],
  sections: []
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const getAppDb = (): StoredTables => {
  if (typeof window === 'undefined') return defaultAppDb();

  const raw = window.localStorage.getItem(APP_DB_STORAGE_KEY);
  if (!raw) {
    const seeded = defaultAppDb();
    window.localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as StoredTables;
    const merged = { ...defaultAppDb(), ...parsed };
    window.localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    const reset = defaultAppDb();
    window.localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(reset));
    return reset;
  }
};

const setAppDb = (db: StoredTables) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(db));
};

const pickColumns = (row: any, columns: string | undefined) => {
  if (!columns || columns.trim() === '*' || columns.trim() === '') return row;

  const keys = columns
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  const subset: Record<string, any> = {};
  keys.forEach(key => {
    subset[key] = row?.[key];
  });
  return subset;
};

const matchesFilters = (row: any, filters: Filter[]) =>
  filters.every(filter => row?.[filter.column] === filter.value);

class LocalQueryBuilder {
  private filters: Filter[] = [];
  private rangeStart?: number;
  private rangeEnd?: number;
  private singleRow = false;
  private selectedColumns?: string;
  private action: (() => QueryResult | Promise<QueryResult>) | null = null;

  constructor(private table: string) {}

  private getRows() {
    return clone(getAppDb()[this.table] || []);
  }

  private applySelect(rows: any[]) {
    const filtered = rows.filter(row => matchesFilters(row, this.filters));
    const ranged =
      typeof this.rangeStart === 'number' && typeof this.rangeEnd === 'number'
        ? filtered.slice(this.rangeStart, this.rangeEnd + 1)
        : filtered;
    const selected = ranged.map(row => pickColumns(row, this.selectedColumns));

    if (this.singleRow) {
      return {
        data: selected[0] ?? null,
        error: selected.length > 0 ? null : { message: 'No rows found' }
      };
    }

    return { data: selected, error: null };
  }

  private commitRows(nextRows: any[]) {
    const db = getAppDb();
    db[this.table] = clone(nextRows);
    setAppDb(db);
  }

  select(columns = '*') {
    this.selectedColumns = columns;
    if (!this.action) {
      this.action = () => this.applySelect(this.getRows());
    }
    return this;
  }

  insert(payload: any | any[]) {
    const rowsToInsert = Array.isArray(payload) ? payload : [payload];
    const insertedRows = clone(rowsToInsert);

    this.action = () => {
      const current = this.getRows();
      this.commitRows([...current, ...insertedRows]);

      if (this.selectedColumns) {
        const selectedRows = insertedRows.map(row => pickColumns(row, this.selectedColumns));
        return {
          data: this.singleRow ? selectedRows[0] ?? null : selectedRows,
          error: null
        };
      }

      return { data: insertedRows, error: null };
    };

    return this;
  }

  upsert(payload: any | any[]) {
    const rowsToUpsert = Array.isArray(payload) ? payload : [payload];

    this.action = () => {
      const current = this.getRows();
      const next = [...current];

      rowsToUpsert.forEach(row => {
        const index = typeof row?.id !== 'undefined'
          ? next.findIndex(existing => existing?.id === row.id)
          : -1;

        if (index >= 0) {
          next[index] = { ...next[index], ...clone(row) };
        } else {
          next.push(clone(row));
        }
      });

      this.commitRows(next);
      return { data: clone(rowsToUpsert), error: null };
    };

    return this;
  }

  update(patch: Record<string, any>) {
    this.action = () => {
      const current = this.getRows();
      const updated: any[] = [];
      const next = current.map(row => {
        if (!matchesFilters(row, this.filters)) return row;
        const merged = { ...row, ...clone(patch) };
        updated.push(merged);
        return merged;
      });

      this.commitRows(next);
      return { data: this.singleRow ? updated[0] ?? null : updated, error: null };
    };

    return this;
  }

  delete() {
    this.action = () => {
      const current = this.getRows();
      const removed = current.filter(row => matchesFilters(row, this.filters));
      const next = current.filter(row => !matchesFilters(row, this.filters));

      this.commitRows(next);
      return { data: this.singleRow ? removed[0] ?? null : removed, error: null };
    };

    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  limit(count: number) {
    this.rangeStart = 0;
    this.rangeEnd = Math.max(0, count - 1);
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    const runner = this.action || (() => this.applySelect(this.getRows()));
    return Promise.resolve(runner()).then(onfulfilled, onrejected);
  }
}

class LocalAppClient {
  from(table: string) {
    return new LocalQueryBuilder(table);
  }
}

// Client specifically for Learner Data.
// Keep a singleton and disable auth session persistence to avoid duplicate GoTrue warnings
// in browser/HMR contexts for read-only anon access.
const getLearnerClient = (): SupabaseClient => {
  const globalScope = globalThis as typeof globalThis & {
    __sptaLearnerClient?: SupabaseClient;
  };

  if (!globalScope.__sptaLearnerClient) {
    globalScope.__sptaLearnerClient = createClient(LEARNER_DB_URL, LEARNER_DB_KEY, {
      auth: {
        storageKey: 'spta-learner-auth-token',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return globalScope.__sptaLearnerClient;
};

export const learnerClient = getLearnerClient();

// Local adapter for retired App DB tables
export const adminClient = new LocalAppClient();

// Default export alias pointing to the local App DB adapter
export const supabase = adminClient;
