type BuildArchiveCommandInput = {
  fromDate: string;
  toDate: string;
  archiveMonths: number;
  archiveReason: string;
  useSelectedRange: boolean;
};

const escapeShellValue = (value: string) => value.replaceAll('"', '\\"');

export function buildAttendanceArchiveCommand(input: BuildArchiveCommandInput) {
  const parts = ['npm run archive:attendance --workspace ./attendance'];

  if (input.useSelectedRange && input.fromDate && input.toDate) {
    parts.push(`-- --from=${input.fromDate}`);
    parts.push(`--to=${input.toDate}`);
  } else {
    parts.push(`-- --months=${Math.max(1, Number(input.archiveMonths) || 3)}`);
  }

  const reason = input.archiveReason.trim();
  if (reason) {
    parts.push(`--reason="${escapeShellValue(reason)}"`);
  }

  return parts.join(' ');
}
