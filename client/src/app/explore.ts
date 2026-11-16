import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';

@Component({
  standalone: true,
  imports: [RouterLink, CurrencyPipe, Notice],
  template: `
    <div class="page-heading"><div><span class="eyebrow">EXPLORE PATH PILOT</span>
      <h1>Your future. All the tools to get there.</h1>
      <p>See what is included, then subscribe to start your career journey.</p></div></div>
    <app-notice [error]="error()" [loading]="loading()" />
    @if (data(); as d) {
      <section class="panel preview-banner">
        <div><span class="tag">{{ active() ? 'SUBSCRIPTION ACTIVE' : 'PREVIEW ONLY' }}</span>
          <h2>{{ active() ? 'Your tools are ready.' : 'One subscription. Every feature.' }}</h2>
          <p>{{ active() ? 'Open any feature below to continue your progress.' : 'Browse the benefits below. An active subscription is required to use any student tool.' }}</p>
          <p class="muted">{{ d.plan.amount / 100 | currency: d.plan.currency }} for {{ d.plan.durationDays }} days · No automatic renewal</p>
        </div>
        <a class="button primary" routerLink="/premium">{{ active() ? 'Manage subscription' : 'View subscription & unlock' }} ↗</a>
      </section>
    }
    <div class="preview-grid">
      @for (feature of features; track feature.path) {
        <article class="panel preview-feature">
          <span class="tag">{{ active() ? 'INCLUDED' : 'SUBSCRIPTION REQUIRED' }}</span>
          <h2>{{ feature.title }}</h2><p>{{ feature.description }}</p>
          <ul class="benefit-list">@for (item of feature.details; track item) { <li>{{ item }}</li> }</ul>
          <a class="text-link" [routerLink]="active() ? feature.path : '/premium'">{{ active() ? 'Open feature' : 'Subscribe to use' }} ↗</a>
        </article>
      }
    </div>
    <p class="muted">Feature descriptions are previews. Personalized results appear only after subscribing and using the tools. Your saved data is retained when access expires.</p>
  `,
})
export class Explore extends PageState {
  api = inject(Api);
  data = signal<any>(null);
  active() { return this.data()?.membership.plan === 'premium'; }
  features = [
    { path: '/dashboard', title: 'Your progress overview', description: 'Bring your learning, practice, and career progress together.', details: ['Learning and test summaries', 'Your next steps in one place'] },
    { path: '/profile', title: 'Profile & skills', description: 'Build the foundation for guidance that reflects your interests.', details: ['Academic background and interests', 'Skill levels and development notes'] },
    { path: '/learning', title: 'Learning tracker', description: 'Keep a record of what you learn and the effort you put in.', details: ['Topics, practice hours, and completion', 'Saved progress across sessions'] },
    { path: '/goals', title: 'Career goals', description: 'Turn career interests into goals you can follow.', details: ['Career targets and target dates', 'Goal status and personal notes'] },
    { path: '/tests', title: 'Mock tests', description: 'Practise your skills and review your answers.', details: ['Skill-based practice questions', 'Saved results and answer explanations'] },
    { path: '/analytics', title: 'Performance analytics', description: 'Understand your progress using your saved activity.', details: ['Test performance and skill summaries', 'Learning progress and readiness estimates'] },
    { path: '/guidance', title: 'Career guidance', description: 'Explore career matches based on your profile and test results.', details: ['Career recommendations and skill gaps', 'Suggested learning resources'] },
    { path: '/premium', title: 'Roadmap & progress report', description: 'Follow a focused plan and take your progress with you.', details: ['Personalized four-week learning roadmap', 'Downloadable career progress report'] },
  ];
  constructor() { super(); this.run(async () => { this.data.set(await this.api.request('/subscription')); }); }
}
