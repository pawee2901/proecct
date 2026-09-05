// Tiny pure helper for building Swal.fire() html strings that interpolate
// student/classroom-supplied text (name, student_code, email, classroom
// name) — same pattern as admin/utils/escape-html.ts, duplicated here
// instead of imported cross-module since Teacher and Admin are separate
// areas of the app.
export function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
