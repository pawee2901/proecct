// Tiny pure helper shared by AdminUsersComponent (teacher directory / edit
// user modals) and AdminCoursesComponent (course details modal) — both build
// Swal.fire() html strings from user-supplied text and need to escape it
// first. Extracted verbatim from the old AdminComponent.escapeHtml().
export function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
