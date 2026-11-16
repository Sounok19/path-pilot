import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Api, PageState } from './api';
import { Notice } from './shared';
import { RouterLink } from '@angular/router';

let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => failed(), 15000);
    function failed() { window.clearTimeout(timeout); script.remove(); checkoutScript = undefined; reject(new Error('Could not load checkout. Check your connection and retry.')); }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { window.clearTimeout(timeout); if ((window as any).Razorpay) resolve(); else failed(); };
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return checkoutScript;
}

@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, Notice, RouterLink],
  template: `<div class="page-heading"><div><span class="eyebrow">INVEST IN YOUR NEXT STEP</span>
    <h1>Your plan, your progress.</h1><p>One subscription unlocks every career guidance feature.</p></div></div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    @if (data(); as d) {
      <div class="notice attention">{{ d.plan.mode === 'simulation' ? 'DEMO SIMULATION — no real money, card details, or Razorpay account required.' : 'Test payments only. No real money is charged in this lab prototype.' }}</div>
      <div class="two-columns">
        <section class="panel premium-card">
          <span class="eyebrow">PATH PILOT PREMIUM</span><h2>A clearer path from learning to doing.</h2>
          <p class="plan-price">{{ d.plan.amount / 100 | currency: d.plan.currency }}<small> / {{ d.plan.durationDays }} days</small></p>
          <ul class="benefit-list">@for (benefit of d.plan.benefits; track benefit) { <li>{{ benefit }}</li> }</ul>
          <p>One payment unlocks all features for the subscription period. No automatic renewal. Without an active subscription, you can preview the benefits but cannot use the tools.</p>
          @if (d.membership.plan === 'premium') { <span class="tag">PREMIUM ACTIVE</span> }
          @else { <button class="button primary" (click)="buy()" [disabled]="loading() || checkoutOpen() || !d.plan.enabled">{{ d.plan.mode === 'simulation' ? 'Subscribe with demo payment' : 'Subscribe with test payment' }} ↗</button> }
          @if (!d.plan.enabled) { <p class="info-note">Checkout is not configured yet. Ask the presenter to add the test payment keys.</p> }
        </section>
        <section class="panel"><span class="eyebrow">YOUR ENROLLMENT</span><h2>{{ d.membership.plan === 'premium' ? 'Subscription active' : 'Preview only' }}</h2>
          <dl class="membership-details"><dt>Enrollment number</dt><dd class="record-id">{{ d.enrollment.number }}</dd>
            <dt>Enrolled on</dt><dd>{{ d.enrollment.enrolledAt | date: 'mediumDate' }}</dd>
            <dt>Feature access</dt><dd>{{ d.membership.expiresAt ? 'Active until ' + (d.membership.expiresAt | date: 'medium') : 'Not active' }}</dd>
          </dl><button class="button subtle" (click)="reload()" [disabled]="loading()">Refresh subscription</button>
        </section>
      </div>
      @if (demoOrder(); as order) {
        <section class="panel demo-checkout" aria-labelledby="demo-checkout-title">
          <span class="tag">SIMULATED CHECKOUT</span>
          <h2 id="demo-checkout-title" tabindex="-1">Try a demo payment</h2>
          <p>{{ order.amount / 100 | currency: order.currency }} · {{ order.durationDays }} days of access</p>
          <p>Choose an outcome for your lab demonstration. Success unlocks all features; failure or cancellation keeps them locked. No money is transferred.</p>
          <div class="inline-form">
            <button class="button primary" (click)="simulate('success')" [disabled]="loading()">Simulate successful payment</button>
            <button class="button subtle" (click)="simulate('failure')" [disabled]="loading()">Simulate failed payment</button>
            <button class="button subtle" (click)="simulate('cancel')" [disabled]="loading()">Cancel demo payment</button>
          </div>
        </section>
      }
      @if (report(); as r) {
        @if (r.needsCareerChoice) {
          <section class="panel"><span class="eyebrow">YOUR DIRECTION, YOUR CHOICE</span>
            <h2>Choose your career direction</h2><p>{{ r.message }}</p>
            <a class="button primary" routerLink="/profile">Choose my career direction ↗</a>
          </section>
        } @else {
        <section class="panel"><div class="section-heading"><div><span class="eyebrow">YOUR PREMIUM ROADMAP</span><h2>Four weeks toward {{ r.career }}</h2></div>
          <button class="button primary" (click)="download()" [disabled]="loading()">Download progress report</button></div>
          <p class="muted">Based on your saved skills, learning progress, and mock tests. Adjust the pace to fit your schedule.</p>
          <div class="goal-grid">@for (week of r.weeks; track week.week) { <article class="roadmap-week"><span class="tag">WEEK {{ week.week }}</span><h3>{{ week.title }}</h3><p>{{ week.action }}</p>
            @if (week.resource) { <a class="text-link" [href]="week.resource.url" target="_blank" rel="noopener noreferrer">Explore learning resource ↗</a> }</article> }</div>
        </section>
        }
      }
      <section class="panel"><h2>Payment history</h2><p class="muted">{{ d.plan.mode === 'simulation' ? 'Demo outcomes are saved here and in the admin payment register. These records do not represent real payments. After a failed or cancelled demo, start a new checkout to retry.' : 'If you completed checkout but your plan has not changed, check that payment’s status. A failed attempt can be retried using the same order.' }}</p>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Reference</th><th>Action</th></tr></thead><tbody>
          @for (p of d.payments; track p.id) { <tr><td>{{ p.createdAt | date: 'mediumDate' }}</td><td>{{ p.amount / 100 | currency: p.currency }}</td>
            <td>{{ p.status | titlecase }}<small>{{ p.mode === 'simulation' ? 'Simulated · no money charged' : 'Razorpay test payment' }}</small>@if (p.lastFailureAt && p.status === 'pending') { <small>Last attempt failed; retry available</small> }</td>
            <td class="record-id">{{ p.providerPaymentId || p.providerOrderId || p.id }}</td>
            <td>@if (p.providerOrderId && p.mode !== 'simulation' && d.plan.mode !== 'simulation') { <button class="text-button" (click)="check(p.id)" [disabled]="loading() || !d.plan.enabled">Check status</button> }</td></tr>
          } @empty { <tr><td colspan="5" class="empty">No payments yet. Subscribe to unlock all features.</td></tr> }
        </tbody></table></div>
      </section>
    }`,
})
export class Premium extends PageState {
  api = inject(Api);
  data = signal<any>(null);
  report = signal<any>(null);
  checkoutOpen = signal(false);
  demoOrder = signal<any>(null);
  constructor() { super(); this.reload(); }
  async load() {
    const data = await this.api.request('/billing'); this.data.set(data); this.report.set(null);
    if (data.membership.plan === 'premium') this.report.set(await this.api.request('/premium/report'));
  }
  reload() { this.run(() => this.load()); }
  buy() { this.run(async () => {
    if (this.data()?.plan.mode === 'simulation') {
      this.demoOrder.set(await this.api.request('/billing/checkout', 'POST', {}));
      this.checkoutOpen.set(true);
      window.requestAnimationFrame(() => document.getElementById('demo-checkout-title')?.focus());
      return;
    }
    await loadCheckout();
    const order = await this.api.request('/billing/checkout', 'POST', {});
    let completed = false;
    const checkout = new (window as any).Razorpay({
      key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
      name: 'Path Pilot', description: `Premium · ${order.durationDays} days · test payment`,
      prefill: { name: this.api.user()?.name, email: this.api.user()?.email }, theme: { color: '#164e43' },
      handler: (response: any) => {
        completed = true; this.checkoutOpen.set(false);
        this.run(async () => {
          const result = await this.api.request('/billing/verify', 'POST', { paymentId: order.paymentId,
            razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
          await this.load();
          this.success.set(result.membership.plan === 'premium' ? 'Payment verified. Your premium plan is active.' : 'Your payment is awaiting confirmation. Check its status shortly.');
        });
      },
      modal: { ondismiss: () => { this.checkoutOpen.set(false); if (!completed) this.run(async () => { await this.load(); this.success.set('Checkout closed. If you completed a payment, use Check status below.'); }); } },
    });
    checkout.on('payment.failed', () => this.error.set('The payment attempt failed. You can retry in checkout. Premium has not been activated.'));
    this.checkoutOpen.set(true);
    try { checkout.open(); } catch (error) { this.checkoutOpen.set(false); throw error; }
    await this.load();
  }); }
  simulate(outcome: 'success' | 'failure' | 'cancel') { this.run(async () => {
    const order = this.demoOrder();
    if (!order) return;
    const result = await this.api.request('/billing/simulate', 'POST', { paymentId: order.paymentId, outcome });
    this.demoOrder.set(null); this.checkoutOpen.set(false);
    await this.load();
    if (result.payment.status === 'paid') this.success.set('Demo payment successful. Your subscription is active. No money was charged.');
    else if (result.payment.status === 'failed') this.error.set('Demo payment failed. Access remains locked. Start a new demo payment to retry.');
    else this.success.set('Demo payment cancelled. No subscription was activated.');
  }); }
  check(paymentId: string) { this.run(async () => {
    const result = await this.api.request('/billing/refresh', 'POST', { paymentId });
    await this.load(); this.success.set(`Payment status: ${result.payment.status}.`);
  }); }
  download() { this.run(async () => {
    // Recheck entitlement server-side instead of exporting stale data after expiry.
    const r = await this.api.request('/premium/report');
    if (r.needsCareerChoice) { this.report.set(r); throw new Error('Choose your career direction before downloading a roadmap.'); }
    const rows = [['Path Pilot premium progress report'], ['Student', r.name], ['Generated', r.generatedAt],
      ['College', r.college], ['Career focus', r.career], ['Readiness estimate (%)', r.readiness],
      ['Completed tests', r.stats.attempts], ['Average test score (%)', r.stats.averageScore], ['Learning hours', r.stats.learningHours],
      [], ['Week', 'Focus', 'Action'], ...r.weeks.map((w: any) => [w.week, w.title, w.action]), [], ['Method', r.method]];
    const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'Path_Pilot_Progress_Report.csv'; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }); }
}
