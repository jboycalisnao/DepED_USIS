export function buildVisitCode() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const stamp = `${yyyy}${mm}${dd}`;
  const sequence = Math.floor(Math.random() * 900 + 100);
  return `CLN-${stamp}-${sequence}`;
}
