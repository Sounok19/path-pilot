import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from './api';
@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: ` <div class="app-layout">
    <aside class="sidebar">
      <a class="brand" [routerLink]="api.user()?.role === 'admin' ? '/admin' : '/dashboard'"
        ><span class="brand-mark">P↗</span> Path Pilot</a
      ><span class="nav-caption">YOUR WORKSPACE</span>
      <nav aria-label="Main navigation">
        @for (item of navigation; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            ><span class="nav-icon" aria-hidden="true">{{ item.icon }}</span
            >{{ item.label }}</a
          >
        }
      </nav>
      <div class="sidebar-note">
        <span class="tiny-star">✳</span><strong>Progress has a direction.</strong>
        <p>A little learning today brings your next goal closer.</p>
      </div>
      <div class="user-card">
        <span class="avatar">{{ api.user()?.name?.charAt(0) }}</span>
        <div>
          <strong>{{ api.user()?.name }}</strong
          ><small>{{ api.user()?.role === 'admin' ? 'Administrator' : 'Student workspace' }}</small>
        </div>
      </div>
      <button class="signout" (click)="logout()">Sign out ↗</button>
      @if (logoutError) {
        <p role="alert">{{ logoutError }}</p>
      }
    </aside>
    <div class="workspace">
      <header class="topbar">
        <span>YOUR FUTURE, ONE STEP AT A TIME</span
        ><span class="workspace-badge"
          >{{ api.user()?.role === 'admin' ? 'ADMIN CONSOLE' : 'STUDENT EDITION' }} <i></i
        ></span>
      </header>
      <main class="page"><router-outlet /></main>
      <footer class="app-footer">
        <span>Path Pilot · Student Career Guidance System</span><span>Learn with purpose.</span>
      </footer>
    </div>
  </div>`,
})
export class Shell {
  api = inject(Api);
  router = inject(Router);
  logoutError = '';
  get navigation() {
    return this.api.user()?.role === 'admin'
      ? [{ path: '/admin', label: 'Administration', icon: '▦' },
         { path: '/admin/enrollments', label: 'Enrolled students', icon: '◎' },
         { path: '/admin/skill-requests', label: 'Skill requests', icon: '✧' },
         { path: '/admin/payments', label: 'Payments', icon: '◈' }]
      : [
          { path: '/explore', label: 'Explore benefits', icon: '✧' },
          { path: '/dashboard', label: 'Overview', icon: '▦' },
          { path: '/profile', label: 'My profile', icon: '◎' },
          { path: '/learning', label: 'Learning tracker', icon: '▤' },
          { path: '/goals', label: 'Career goals', icon: '⚑' },
          { path: '/tests', label: 'Mock tests', icon: '◈' },
          { path: '/analytics', label: 'Performance', icon: '▥' },
          { path: '/guidance', label: 'Career guidance', icon: '↗' },
          { path: '/premium', label: 'Subscription & payments', icon: '✳' },
        ];
  }
  async logout() {
    try {
      await this.api.logout();
      await this.router.navigateByUrl('/login');
    } catch {
      this.logoutError = 'Could not sign out. Please retry.';
    }
  }
}
