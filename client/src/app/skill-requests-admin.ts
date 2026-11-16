import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, Notice],
  template: `<div class="page-heading"><div><span class="eyebrow">STUDENT-LED LEARNING</span><h1>Review skill requests.</h1>
    <p>Verify the requested skill and domain, then add questions for approved skills.</p></div></div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    <button class="button subtle" (click)="reload()" [disabled]="loading()">Refresh requests</button>
    @if (data(); as d) {
      @for (r of d.rows; track r._id) {
        <section class="panel request-card"><span class="tag">{{ r.status }}</span><h2>{{ r.name }}</h2><p>{{ r.domain }}</p>
          <p>Requested by {{ r.user?.name || 'Former student' }} · {{ r.user?.email }}</p><p>{{ r.reason }}</p>
          @if (r.status === 'pending') {
            <label>Review note for {{ r.name }}<textarea [(ngModel)]="notes[r._id]" maxlength="300" placeholder="Explain your decision or the planned test coverage."></textarea></label>
            <div class="inline-form"><button class="button primary" (click)="review(r._id, 'approved')" [disabled]="loading()">Approve {{ r.name }}</button>
              <button class="button subtle" (click)="review(r._id, 'rejected')" [disabled]="loading()">Reject {{ r.name }}</button></div>
          } @else {
            @if (r.reviewNote) { <p>Review note: {{ r.reviewNote }}</p> }
            @if (r.status === 'approved') {
              <p>{{ r.questionCount ? r.questionCount + ' active questions available.' : 'Approved. Tests are not available until you publish active questions.' }}</p>
              <a class="button primary" routerLink="/admin" [queryParams]="{ skill: r.name }">Add test questions for {{ r.name }} ↗</a>
            }
          }
        </section>
      } @empty { <section class="panel empty">No skill requests yet.</section> }
      <div class="save-bar"><span>{{ d.total }} requests · Page {{ page }}</span><div class="inline-form">
        <button class="button subtle" (click)="go(-1)" [disabled]="loading() || page <= 1">Previous</button>
        <button class="button subtle" (click)="go(1)" [disabled]="loading() || page * d.pageSize >= d.total">Next</button>
      </div></div>
    }`,
})
export class SkillRequestsAdmin extends PageState {
  api = inject(Api); data = signal<any>(null); notes: Record<string, string> = {}; page = 1;
  constructor() { super(); this.reload(); }
  async load() { this.data.set(await this.api.request('/admin/skill-requests?page=' + this.page)); }
  reload() { this.run(() => this.load()); }
  go(step: number) { this.page += step; this.reload(); }
  review(id: string, status: 'approved' | 'rejected') { this.run(async () => {
    await this.api.request('/admin/skill-requests/' + id, 'PUT', { status, reviewNote: this.notes[id] || '' });
    await this.load(); this.success.set(status === 'approved' ? 'Skill approved. Add test questions to make practice available.' : 'Request rejected. The student can see your feedback.');
  }); }
}
