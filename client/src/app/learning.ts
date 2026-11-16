import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, PageState, Profile } from './api';
import { Notice } from './shared';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [FormsModule, Notice, RouterLink],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">BUILD YOUR TOOLKIT</span>
        <h1>Learning, in motion.</h1>
        <p>Track the skills you’re building and the topics you cover along the way.</p>
      </div>
    </div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    @if (profile(); as p) {
      <form #f="ngForm" (ngSubmit)="save()">
        <section class="panel">
          <div class="section-heading">
            <div>
              <h2>My skills</h2>
              <p class="muted">Rate your current confidence from 0 to 100.</p>
            </div>
            <div class="inline-form">
              <select name="newSkill" [(ngModel)]="newSkill" aria-label="Skill to add">
                @for (s of availableSkills(); track s) {
                  <option [value]="s">{{ s }}</option>
                }</select
              ><button
                type="button"
                class="button subtle"
                (click)="addSkill()"
                [disabled]="!newSkill || loading()"
              >
                + Add skill
              </button>
              <button type="button" class="text-button" (click)="showRequest()">Request another skill</button>
            </div>
          </div>
          @for (s of p.skills; track s.name; let i = $index) {
            <div class="skill-editor">
              <div class="row-title">
                <h3>{{ s.name }}</h3>
                <button
                  type="button"
                  class="text-button danger"
                  (click)="p.skills.splice(i, 1); refreshSkill()"
                  [attr.aria-label]="'Remove ' + s.name"
                >
                  Remove
                </button>
              </div>
              <div class="form-grid">
                <label
                  >Confidence · {{ s.level }} / 100<input
                    type="range"
                    min="0"
                    max="100"
                    [(ngModel)]="s.level"
                    [name]="'level' + i" /></label
                ><label
                  >Area to develop<input
                    [(ngModel)]="s.development"
                    [name]="'development' + i"
                    maxlength="300"
                    placeholder="What would you like to improve?"
                /></label>
              </div>
            </div>
          } @empty {
            <div class="empty">
              <h3>What can you do today?</h3>
              <p>Add your first skill and record your current confidence.</p>
            </div>
          }
        </section>
        <section class="panel">
          <div class="section-heading">
            <div>
              <h2>Learning log</h2>
              <p class="muted">Progress and time spent are recorded by you.</p>
            </div>
            <button
              type="button"
              class="button subtle"
              (click)="addTopic()"
              [disabled]="loading() || p.topics.length >= 100"
            >
              + Add topic
            </button>
          </div>
          @for (t of p.topics; track t.id; let i = $index) {
            <div class="topic-editor">
              <div class="form-grid">
                <label
                  >Topic title<input
                    [(ngModel)]="t.title"
                    [name]="'topic' + i"
                    required
                    minlength="2"
                    maxlength="150"
                    placeholder="e.g. Building a REST API" /></label
                ><label
                  >Related skill<select [(ngModel)]="t.skill" [name]="'topicSkill' + i">
                    @for (s of catalog()?.skillNames; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select></label
                ><label
                  >Progress (%)<input
                    type="number"
                    [(ngModel)]="t.progress"
                    [name]="'progress' + i"
                    min="0"
                    max="100"
                    required /></label
                ><label
                  >Hours spent<input
                    type="number"
                    [(ngModel)]="t.hours"
                    [name]="'hours' + i"
                    min="0"
                    max="10000"
                    step="0.5"
                    required
                /></label>
              </div>
              <button type="button" class="text-button danger" (click)="p.topics.splice(i, 1)">
                Remove topic
              </button>
            </div>
          } @empty {
            <div class="empty">
              <h3>Start with one topic.</h3>
              <p>Add something you’re learning this week.</p>
            </div>
          }
        </section>
        <div class="save-bar">
          <span>Additions, edits, and removals are saved together.</span
          ><button class="button primary" [disabled]="f.invalid || loading()">
            Save learning progress ↗
          </button>
        </div>
      </form>
      <section class="panel" aria-labelledby="request-skill-heading">
        <h2 id="request-skill-heading" tabindex="-1">Want to learn another skill?</h2>
        <p>Keep using the approved list above, or request a new skill in your domain. An admin will review it and prepare practice questions.</p>
        <form #requestForm="ngForm" (ngSubmit)="requestSkill()">
          <div class="form-grid">
            <label>Requested skill<input name="requestedSkill" [(ngModel)]="requestDraft.name" required minlength="2" maxlength="60" placeholder="e.g. React or Power BI" /></label>
            <label>Skill domain<select name="requestDomain" [(ngModel)]="requestDraft.domain" required>
              <option value="" disabled>Select a domain</option>
              @for (domain of catalog()?.skillDomains; track domain) { <option [value]="domain">{{ domain }}</option> }
            </select></label>
          </div>
          <label>What would you like to learn?<textarea name="requestReason" [(ngModel)]="requestDraft.reason" required minlength="10" maxlength="500" placeholder="Explain your interest and the topics you want to practise."></textarea></label>
          <button class="button primary" [disabled]="requestForm.invalid || loading()">Send skill request</button>
        </form>
      </section>
      <section class="panel"><div class="section-heading"><h2>My skill requests</h2><button type="button" class="button subtle" (click)="refreshRequests()" [disabled]="loading()">Refresh requests</button></div>
        <p class="muted">Approval adds the skill to the dropdown. Tests appear after the admin publishes active questions. Refresh this list after a review; unsaved learning edits are kept.</p>
        @for (r of requests(); track r._id) {
          <article class="request-card"><h3>{{ r.name }} <span class="tag">{{ r.status }}</span></h3><p>{{ r.domain }}</p>
            @if (r.reviewNote) { <p>Admin feedback: {{ r.reviewNote }}</p> }
            @if (r.status === 'pending') { <p>Waiting for admin review.</p> }
            @if (r.status === 'approved') {
              <p>Approved — select this skill under My skills and save your learning progress.</p>
              @if (r.questionCount > 0) { <a class="text-link" routerLink="/tests" [queryParams]="{ skill: r.name }">Practise {{ r.name }} · {{ r.questionCount }} questions ↗</a> }
              @else { <p class="info-note">Tests are being prepared by the admin.</p> }
            }
          </article>
        } @empty { <p class="empty">No skill requests yet.</p> }
      </section>
    }`,
})
export class Learning extends PageState {
  api = inject(Api);
  profile = signal<Profile | null>(null);
  catalog = signal<any>(null);
  newSkill = '';
  requests = signal<any[]>([]);
  requestDraft = { name: '', domain: '', reason: '' };
  constructor() {
    super();
    this.run(async () => {
      const [p, c, requests] = await Promise.all([
        this.api.request<Profile>('/profile'),
        this.api.request('/catalog'),
        this.api.request<any[]>('/skill-requests'),
      ]);
      this.profile.set(p);
      this.catalog.set(c);
      this.requests.set(requests);
      this.refreshSkill();
    });
  }
  availableSkills(): string[] {
    return (this.catalog()?.skillNames || []).filter(
      (s: string) => !this.profile()?.skills.some((x) => x.name === s),
    );
  }
  showRequest() { document.getElementById('request-skill-heading')?.focus(); }
  async loadRequests() {
    const [requests, catalog] = await Promise.all([this.api.request<any[]>('/skill-requests'), this.api.request('/catalog')]);
    this.requests.set(requests); this.catalog.set(catalog); this.refreshSkill();
  }
  refreshRequests() { this.run(() => this.loadRequests()); }
  requestSkill() { this.run(async () => {
    await this.api.request('/skill-requests', 'POST', this.requestDraft);
    this.requestDraft = { name: '', domain: '', reason: '' };
    await this.loadRequests(); this.success.set('Skill request sent. An admin will review it before it becomes available.');
  }); }
  refreshSkill() {
    this.newSkill = this.availableSkills()[0] || '';
  }
  addSkill() {
    if (this.newSkill) {
      this.profile()!.skills.push({ name: this.newSkill, level: 0, development: '' });
      this.refreshSkill();
    }
  }
  addTopic() {
    this.profile()!.topics.push({
      id: crypto.randomUUID(),
      title: '',
      skill: 'JavaScript',
      progress: 0,
      hours: 0,
    });
  }
  save() {
    this.run(async () => {
      this.profile.set(await this.api.saveProfile(this.profile()!));
      this.success.set('Learning progress saved.');
    });
  }
}
