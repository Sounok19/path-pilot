import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Api, PageState } from './api';
import { Notice } from './shared';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe, TitleCasePipe, Notice],
  template: `<div class="page-heading"><div><span class="eyebrow">STUDENT ENROLLMENT REGISTER</span>
    <h1>Every student. One clear view.</h1><p>Find registered students, review academic details, and check subscription access.</p></div></div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    <section class="panel">
      <form class="form-grid" (ngSubmit)="search()">
        <label>Search by name or email<input name="search" [(ngModel)]="query" maxlength="100" placeholder="Find a student" /></label>
        <label>Plan<select name="plan" [(ngModel)]="plan"><option value="all">All students</option><option value="preview">No active subscription</option><option value="premium">Subscribed</option></select></label>
        <div><button class="button primary" [disabled]="loading()">Search students</button></div>
      </form>
    </section>
    @if (data(); as d) {
      <section class="panel">
        <div class="section-heading"><h2>Enrolled students</h2><span class="tag">{{ d.total }} RECORDS</span></div>
        <p class="muted">Registration creates an enrollment record. All student tools require an active subscription, granted after a verified payment.</p>
        <div class="table-wrap"><table><thead><tr><th>Student</th><th>Academic details</th><th>Enrollment</th><th>Plan</th><th>Latest payment</th></tr></thead><tbody>
          @for (s of d.rows; track s.id) {
            <tr><td><strong>{{ s.name }}</strong><small>{{ s.email }}</small></td>
              <td>{{ s.college || 'Not added' }}<small>{{ s.degree }}{{ s.year ? ' · Year ' + s.year : '' }}</small></td>
              <td><small class="record-id">{{ s.enrollmentNumber }}</small>{{ s.enrolledAt | date: 'mediumDate' }}</td>
              <td><span class="tag">{{ s.plan === 'premium' ? 'Subscribed' : 'Preview only' }}</span>@if (s.expiresAt) { <small>Until {{ s.expiresAt | date: 'mediumDate' }}</small> }</td>
              <td>@if (s.lastPayment; as p) { {{ p.amount / 100 | currency: p.currency }}<small>{{ p.status | titlecase }} · {{ p.mode | titlecase }}</small> } @else { No payments }</td></tr>
          } @empty { <tr><td colspan="5" class="empty">No students match these filters.</td></tr> }
        </tbody></table></div>
        <div class="save-bar"><span>Page {{ d.page }} of {{ pages() }}</span><div class="inline-form">
          <button class="button subtle" (click)="go(-1)" [disabled]="loading() || d.page <= 1">Previous</button>
          <button class="button subtle" (click)="go(1)" [disabled]="loading() || d.page >= pages()">Next</button>
        </div></div>
      </section>
    }`,
})
export class Enrollments extends PageState {
  api = inject(Api);
  data = signal<any>(null);
  query = '';
  plan = 'all';
  page = 1;
  constructor() { super(); this.load(); }
  pages() { return Math.max(1, Math.ceil((this.data()?.total || 0) / 20)); }
  search() { this.page = 1; this.load(); }
  go(step: number) { this.page += step; this.load(); }
  load() { this.run(async () => {
    const params = new URLSearchParams({ q: this.query, plan: this.plan, page: String(this.page) });
    this.data.set(await this.api.request(`/admin/enrollments?${params}`));
  }); }
}
