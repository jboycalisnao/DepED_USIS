import { KioskState } from '../../lib/kiosk';

export interface KioskStatItem {
  id: 'balance' | 'assessment' | 'paid' | 'tendered';
  label: string;
  value: string;
  helper: string;
}

export const statCardStyles = [
  {
    shell: 'border-[var(--deped-line)] bg-[#eef4ff]',
    accent: 'bg-[var(--deped-blue)]',
    label: 'text-[var(--deped-blue)]',
    value: 'text-[var(--deped-ink)]',
    helper: 'text-[var(--deped-muted)]'
  },
  {
    shell: 'border-[var(--deped-line)] bg-[#eef8f2]',
    accent: 'bg-[#2f855a]',
    label: 'text-[var(--deped-blue)]',
    value: 'text-[var(--deped-ink)]',
    helper: 'text-[var(--deped-muted)]'
  },
  {
    shell: 'border-[var(--deped-line)] bg-[#fff9ea]',
    accent: 'bg-[var(--deped-yellow)]',
    label: 'text-[var(--deped-blue)]',
    value: 'text-[var(--deped-ink)]',
    helper: 'text-[var(--deped-muted)]'
  },
  {
    shell: 'border-[var(--deped-line)] bg-[#f5f1ff]',
    accent: 'bg-[var(--deped-red)]',
    label: 'text-[var(--deped-blue)]',
    value: 'text-[var(--deped-ink)]',
    helper: 'text-[var(--deped-muted)]'
  }
] as const;

export const formatCurrency = (value: number) => `PHP ${value.toLocaleString()}`;

export const buildStatItems = (state: KioskState): KioskStatItem[] => [
  { id: 'balance', label: 'Current Balance', value: formatCurrency(state.balance), helper: 'Outstanding now' },
  { id: 'assessment', label: 'Total Assessment', value: formatCurrency(state.totalAssessment), helper: 'Overall payable amount' },
  { id: 'paid', label: 'Total Paid', value: formatCurrency(state.totalPaid), helper: 'Posted payments so far' },
  { id: 'tendered', label: 'Amount Tendered', value: formatCurrency(state.amountTendered), helper: 'Cash received this step' }
];
