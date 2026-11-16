import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, PageState, Profile } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [FormsModule, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">GIVE YOUR EFFORT A DIRECTION</span>
        <h1>What’s your next chapter?</h1>
        <p>Choose a path, set a target date, and give yourself something to work towards.</p>
      </div>
      <button
        class="button primary"
        (click)="add()"
        [disabled]="!profile() || loading() || (profile()?.goals?.length || 0) >= 20"
      >
        + Add a goal
      </button>
    </div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    @if (profile(); as p) {
      <form #f="ngForm" (ngSubmit)="save()">
        <div class="goal-grid">
          @for (g of p.goals; track g.id; let i = $index) {
            <section class="panel goal-card">
              <div class="row-title">
                <span class="tag">{{
                  g.status === 'completed' ? 'COMPLETED' : 'ON YOUR HORIZON'
                }}</span
                ><button type="button" class="text-button danger" (click)="p.goals.splice(i, 1)">
                  Remove
                </button>
              </div>
              <label
                >Career path<select [(ngModel)]="g.careerId" [name]="'career' + i" required>
                  @for (c of catalog()?.careers; track c.id) {
                    <option [value]="c.id">{{ c.title }}</option>
                  }
                </select></label
              >
              <div class="form-grid">
                <label
                  >Target date<input
                    type="date"
                    [(ngModel)]="g.targetDate"
                    [name]="'date' + i"
                    required /></label
                ><label
                  >Status<select [(ngModel)]="g.status" [name]="'status' + i">
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select></label
                >
              </div>
              <label
                >What does success look like?<textarea
                  [(ngModel)]="g.notes"
                  [name]="'notes' + i"
                  maxlength="500"
                  rows="3"
                  placeholder="A project, internship, or personal milestone…"
                ></textarea>
              </label>
            </section>
          } @empty {
            <section class="panel empty">
              <h2>Every journey starts with a goal.</h2>
              <p>Add a career path you’d like to explore.</p>
            </section>
          }
        </div>
        <div class="save-bar">
          <span>Active goals help prioritize your recommendations.</span
          ><button class="button primary" [disabled]="f.invalid || loading()">Save goals ↗</button>
        </div>
      </form>
    }`,
})
export class Goals extends PageState {
  api = inject(Api);
  profile = signal<Profile | null>(null);
  catalog = signal<any>(null);
  constructor() {
    super();
    this.run(async () => {
      const [p, c] = await Promise.all([
        this.api.request<Profile>('/profile'),
        this.api.request('/catalog'),
      ]);
      this.profile.set(p);
      this.catalog.set(c);
    });
  }
  add() {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    this.profile()!.goals.push({
      id: crypto.randomUUID(),
      careerId: 'full-stack',
      targetDate: date.toISOString().slice(0, 10),
      status: 'active',
      notes: '',
    });
  }
  save() {
    this.run(async () => {
      this.profile.set(await this.api.saveProfile(this.profile()!));
      this.success.set('Goals saved. Your roadmap has been updated.');
    });
  }
}
