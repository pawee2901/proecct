import { Component } from '@angular/core';

// Reusable decorative page background: soft pink/lavender/cream gradient
// wash + floating clouds/sparkles/paper-airplane + two hand-drawn corner
// illustrations (bunny reading atop a stack of books, and a backpack with
// leaning books + an open book). Purely decorative -- aria-hidden and
// pointer-events: none throughout -- so it can be dropped in as the first
// child of any `position: relative` page wrapper (see student-shell and
// login-register, the two places this is used) without affecting layout
// or interaction. Kept as its own component instead of duplicating the
// SVG markup in both places.
@Component({
  selector: 'app-cute-background',
  standalone: true,
  imports: [],
  templateUrl: './cute-background.component.html',
  styleUrl: './cute-background.component.scss',
})
export class CuteBackgroundComponent {}
