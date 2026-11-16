import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, Notice],
  template: `<div class="page-heading"><div><span class="eyebrow">PAYMENT REGISTER</span><h1>Track every upgrade.</h1><p>Review student payments, demo outcomes, and subscription dates.</p></div></div>
    <app-notice [error]="error()" [loading]="loading()" />
    <div class="notice attention">Simulation records are classroom demos. Razorpay test records are gateway tests. Neither represents real revenue.</div>
    @if (data(); as d) { <section class="panel"><div class="section-heading"><h2>Premium payments</h2><button class="button subtle" (click)="load()" [disabled]="loading()">Refresh</button></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Amount</th><th>Status</th><th>Reference</th><th>Created / access until</th></tr></thead><tbody>
        @for (p of d.rows; track p.id) { <tr><td>{{ p.student?.name || 'Former student' }}<small>{{ p.student?.email }}</small></td>
          <td>{{ p.amount / 100 | currency: p.currency }}<small>{{ p.durationDays }} days</small></td><td>{{ p.status | titlecase }}<small>{{ p.mode | titlecase }}</small></td>
          <td class="record-id">{{ p.providerPaymentId || p.providerOrderId || p.id }}</td><td>{{ p.createdAt | date: 'mediumDate' }}<small>{{ p.expiresAt ? (p.expiresAt | date: 'mediumDate') : 'Not activated' }}</small></td></tr>
        } @empty { <tr><td colspan="5" class="empty">No payment records yet.</td></tr> }
      </tbody></table></div><div class="save-bar"><span>{{ d.total }} records · Page {{ d.page }} of {{ pages() }}</span><div class="inline-form">
        <button class="button subtle" (click)="go(-1)" [disabled]="loading() || page <= 1">Previous</button><button class="button subtle" (click)="go(1)" [disabled]="loading() || page >= pages()">Next</button>
      </div></div></section> }`,
})
export class PaymentsAdmin extends PageState {
  api = inject(Api); data = signal<any>(null); page = 1;
  constructor() { super(); this.load(); }
  pages() { return Math.max(1, Math.ceil((this.data()?.total || 0) / 20)); }
  go(step: number) { this.page += step; this.load(); }
  load() { this.run(async () => this.data.set(await this.api.request(`/admin/payments?page=${this.page}`))); }
}
