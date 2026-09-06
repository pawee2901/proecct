import { Component, HostBinding, Input } from '@angular/core';

// Reusable decorative page background: soft pink/lavender/cream gradient
// wash + floating clouds/sparkles/paper-airplane + two corner illustrations
// (bunny reading atop a stack of books, and a backpack with leaning books +
// an open book). Purely decorative -- aria-hidden and pointer-events: none
// throughout -- so it can be dropped in as the first child of any
// `position: relative` page wrapper (see student-shell and login-register,
// the two places this is used) without affecting layout or interaction.
// Kept as its own component instead of duplicating the markup in both
// places.
@Component({
  selector: 'app-cute-background',
  standalone: true,
  imports: [],
  templateUrl: './cute-background.component.html',
  styleUrl: './cute-background.component.scss',
})
export class CuteBackgroundComponent {
  // Set by a host page that renders Student Shell's fixed mobile bottom-nav
  // (64px, only present below 768px -- see student-shell.component.scss).
  // The corner illustrations are anchored `bottom: 0` of this component's
  // full-viewport-height host, same as that fixed bar, so without this they
  // end up ~90% hidden behind it on mobile with only a meaningless sliver
  // poking out above it. login-register has no bottom-nav, so it leaves
  // this false (default) and the illustrations keep sitting flush at the
  // very bottom there.
  @Input() hasBottomNav = false;

  @HostBinding('class.has-bottom-nav')
  get hasBottomNavClass(): boolean {
    return this.hasBottomNav;
  }
}
