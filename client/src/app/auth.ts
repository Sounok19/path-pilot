import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [FormsModule, Notice],
  template: ` <main class="auth-layout">
    <section class="auth-story">
      <a class="brand" href="/"><span class="brand-mark">P↗</span> Path Pilot</a>
      <div class="story-content">
        <span class="eyebrow light">A LITTLE DIRECTION. A LOT OF POSSIBILITY.</span>
        <h1>Your next chapter<br />starts with you.</h1>
        <p>Connect what you’re learning today with the career you want tomorrow.</p>
        <div class="orbit">
          <div class="orbit-inner">
            <span>YOUR PATH</span><strong>Learn.<br />Practise.<br />Grow.</strong>
          </div>
          <span class="orbit-dot one">Skills</span><span class="orbit-dot two">Goals</span
          ><span class="orbit-dot three">Progress</span>
        </div>
      </div>
      <div class="story-footer">STUDENT CAREER GUIDANCE <span>MEAN STACK / PATH PILOT</span></div>
    </section>
    <section class="auth-form">
      <div class="auth-card">
        <span class="eyebrow">LET’S FIND YOUR DIRECTION</span>
        <h2>{{ register() ? 'Create your account' : 'Welcome back.' }}</h2>
        <p class="muted">
          {{
            register()
              ? 'Create an account to explore the benefits. Subscribe to use the tools.'
              : 'Your goals, progress, and next steps are waiting.'
          }}
        </p>
        <app-notice [error]="error()" [loading]="loading()" />
        <form (ngSubmit)="submit()" #f="ngForm">
          @if (register()) {
            <label
              >Your name<input
                name="name"
                [(ngModel)]="name"
                required
                minlength="2"
                maxlength="80"
                autocomplete="name"
                placeholder="Your full name"
            /></label>
          }
          <label
            >Email address<input
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              autocomplete="email"
              placeholder="you@college.edu"
          /></label>
          <label
            >Password<input
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              minlength="10"
              maxlength="72"
              [autocomplete]="register() ? 'new-password' : 'current-password'"
              placeholder="At least 10 characters"
          /></label>
          <button class="button primary wide" [disabled]="f.invalid || loading()">
            {{ register() ? 'Create account' : 'Sign in' }} <span>↗</span>
          </button>
        </form>
        <p class="auth-switch">
          {{ register() ? 'Already have an account?' : 'New to Path Pilot?' }}
          <button class="text-button" (click)="register.set(!register()); error.set('')">
            {{ register() ? 'Sign in' : 'Create an account' }}
          </button>
        </p>
        <div class="demo-note">
          <strong>Exploring the lab demo?</strong>
          <p>
            Student: <b>student&#64;pathpilot.local</b><br />
            Ask the presenter for the demo password, or create your own student account.
          </p>
          <small
            >Your saved profile and test results are stored in the project database.</small
          >
        </div>
      </div>
      <footer>Small steps. Clear direction. Your future.</footer>
    </section>
  </main>`,
})
export class AuthPage extends PageState {
  api = inject(Api);
  router = inject(Router);
  register = signal(false);
  name = '';
  email = '';
  password = '';
  submit() {
    this.run(async () => {
      const u = await this.api.login(
        this.register()
          ? { name: this.name, email: this.email, password: this.password }
          : { email: this.email, password: this.password },
        this.register(),
      );
      await this.router.navigateByUrl(u.role === 'admin' ? '/admin' : '/dashboard');
    });
  }
}
