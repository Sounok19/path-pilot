import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">PRACTICE BUILDS CONFIDENCE</span>
        <h1>Put your learning to work.</h1>
        <p>Short, untimed practice tests. Clear feedback. Another step forward.</p>
      </div>
    </div>
    <app-notice [error]="error()" [loading]="loading()" />
    <div class="two-columns">
      <section class="panel test-card">
        <span class="test-icon">◈</span><span class="tag">LOCAL QUESTION BANK</span>
        <h2>Skill practice</h2>
        <p>Up to 5 questions from your chosen skill. Get instant explanations after submitting.</p>
        <label
          >Choose a skill<select [(ngModel)]="skill">
            <option>Mixed</option>
            @for (g of catalog()?.groups; track g._id) {
              <option [value]="g._id">{{ g._id }} ({{ g.count }})</option>
            }
          </select></label
        ><button
          class="button primary"
          (click)="start('local')"
          [disabled]="loading() || !catalog()"
        >
          Start practice ↗
        </button>
      </section>
      <section class="panel test-card external">
        <span class="test-icon">◎</span><span class="tag">EXTERNAL PRACTICE</span>
        <h2>Computer fundamentals</h2>
        <p>
          Explore 5 computer trivia questions from Open Trivia DB. A local test takes over if the
          service is unavailable.
        </p>
        <p class="muted">
          General trivia is shown in performance history, but does not change career-specific skill
          estimates.
        </p>
        <button
          class="button subtle"
          (click)="start('external')"
          [disabled]="loading() || !catalog()"
        >
          {{
            catalog()?.externalEnabled ? 'Try external practice' : 'Practise with local fallback'
          }}
          ↗</button
        ><small>Open Trivia DB · CC BY-SA 4.0</small>
      </section>
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">YOUR PRACTICE JOURNEY</span>
          <h2>Recent attempts</h2>
        </div>
        <a routerLink="/analytics" class="text-link">View performance ↗</a>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Practice</th>
              <th>Started</th>
              <th>Result</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (a of attempts(); track a._id) {
              <tr>
                <td>
                  <strong>{{ a.title }}</strong
                  ><small>{{ a.source }}</small>
                </td>
                <td>{{ a.createdAt | date: 'mediumDate' }}</td>
                <td>
                  <span class="tag">{{
                    a.status === 'submitted' ? a.score + '%' : 'In progress'
                  }}</span>
                </td>
                <td>
                  <a class="text-link" [routerLink]="['/tests', a._id]"
                    >{{ a.status === 'submitted' ? 'Review' : 'Resume' }} →</a
                  >
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">No tests yet. Start your first practice above.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>`,
})
export class Tests extends PageState {
  api = inject(Api);
  route = inject(ActivatedRoute);
  router = inject(Router);
  catalog = signal<any>(null);
  attempts = signal<any[]>([]);
  skill = 'Mixed';
  constructor() {
    super();
    this.run(async () => {
      const [c, a] = await Promise.all([
        this.api.request('/tests'),
        this.api.request<any[]>('/attempts'),
      ]);
      this.catalog.set(c);
      const selected = this.route.snapshot.queryParamMap.get('skill');
      if (c.groups.some((g: any) => g._id === selected)) this.skill = selected!;
      this.attempts.set(a);
    });
  }
  start(source: string) {
    this.run(async () => {
      const a = await this.api.request('/attempts', 'POST', {
        source,
        skill: source === 'external' ? 'Mixed' : this.skill,
      });
      await this.router.navigate(['/tests', a._id]);
    });
  }
}
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">A MOMENT TO PRACTISE</span>
        <h1>{{ attempt()?.title || 'Your practice test' }}</h1>
        <p>{{ attempt()?.source }} · Untimed practice</p>
      </div>
      <a routerLink="/tests" class="button subtle">← All tests</a>
    </div>
    <app-notice [error]="error()" [loading]="loading()" />
    @if (attempt(); as a) {
      @if (a.notice) {
        <div class="info-note">
          {{ a.notice }}
          @if (a.source === 'Open Trivia DB') {
            <a href="https://opentdb.com/" target="_blank" rel="noopener noreferrer">Source</a> ·
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              >License</a
            >
          }
        </div>
      }
      @if (a.status === 'submitted') {
        <section class="result-banner">
          <div>
            <span class="eyebrow">PRACTICE COMPLETE</span>
            <h2>
              {{ a.score >= 70 ? 'You’re building momentum.' : 'Every attempt is a step forward.' }}
            </h2>
            <p>{{ a.correct }} of {{ a.total }} correct. Review your answers below.</p>
          </div>
          <strong>{{ a.score }}<small>%</small></strong>
        </section>
      }
      <form (ngSubmit)="submit()">
        @for (q of a.questions; track $index; let i = $index) {
          <fieldset class="panel question">
            <legend>QUESTION {{ i + 1 }} / {{ a.total }} · {{ q.skill }}</legend>
            <h2>{{ q.prompt }}</h2>
            @for (option of q.options; track $index; let j = $index) {
              <label
                class="answer-option"
                [class.correct]="a.status === 'submitted' && q.correctIndex === j"
                [class.incorrect]="
                  a.status === 'submitted' && a.answers[i] === j && q.correctIndex !== j
                "
                ><input
                  type="radio"
                  [name]="'q' + i"
                  [value]="j"
                  [(ngModel)]="answers[i]"
                  (ngModelChange)="saveDraft()"
                  [disabled]="a.status === 'submitted' || loading()"
                /><span>{{ option }}</span>
                @if (a.status === 'submitted' && q.correctIndex === j) {
                  <b>✓ Correct</b>
                }
              </label>
            }
            @if (a.status === 'submitted') {
              <p class="explanation">{{ q.explanation }}</p>
            }
          </fieldset>
        }
        @if (a.status !== 'submitted') {
          <div class="save-bar">
            <span
              >{{ answered() }} / {{ a.total }} answered · Answers are final when submitted.</span
            ><button class="button primary" [disabled]="loading() || answered() !== a.total">
              Submit test ↗
            </button>
          </div>
        } @else {
          <a class="button primary" routerLink="/analytics">See performance ↗</a>
        }
      </form>
    }`,
})
export class AttemptPage extends PageState {
  api = inject(Api);
  route = inject(ActivatedRoute);
  attempt = signal<any>(null);
  answers: (number | null)[] = [];
  id = this.route.snapshot.paramMap.get('id')!;
  constructor() {
    super();
    this.run(async () => {
      const a = await this.api.request(`/attempts/${this.id}`);
      this.attempt.set(a);
      if (a.status === 'submitted') this.answers = a.answers;
      else {
        try {
          const stored = JSON.parse(sessionStorage.getItem(`pilot-draft-${this.id}`) || 'null');
          this.answers =
            Array.isArray(stored) && stored.length === a.total ? stored : Array(a.total).fill(null);
        } catch {
          this.answers = Array(a.total).fill(null);
        }
      }
    });
  }
  answered() {
    return this.answers.filter((a) => a !== null && Number.isInteger(a)).length;
  }
  saveDraft() {
    sessionStorage.setItem(`pilot-draft-${this.id}`, JSON.stringify(this.answers));
  }
  submit() {
    this.run(async () => {
      this.attempt.set(
        await this.api.request(`/attempts/${this.id}/submit`, 'POST', { answers: this.answers }),
      );
      sessionStorage.removeItem(`pilot-draft-${this.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
