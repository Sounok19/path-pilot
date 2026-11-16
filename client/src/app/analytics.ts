import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">SEE HOW FAR YOU’VE COME</span>
        <h1>Your effort, made visible.</h1>
        <p>Look for patterns, celebrate progress, and find your next area of focus.</p>
      </div>
      <a routerLink="/tests" class="button primary">Practise again ↗</a>
    </div>
    <app-notice [error]="error()" [loading]="loading()" />
    @if (stats(); as s) {
      <div class="stats-grid">
        <article class="stat">
          <span>TESTS COMPLETED</span><strong>{{ s.attempts }}</strong>
        </article>
        <article class="stat">
          <span>AVERAGE SCORE</span
          ><strong>{{ s.attempts ? s.averageScore : '—' }}<small>%</small></strong>
        </article>
        <article class="stat">
          <span>PERSONAL BEST</span
          ><strong>{{ s.attempts ? s.bestScore : '—' }}<small>%</small></strong>
        </article>
        <article class="stat">
          <span>TOPIC PROGRESS</span><strong>{{ s.topicProgress }}<small>%</small></strong>
        </article>
      </div>
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Your recent test scores</h2>
            <p class="muted">
              Last 10 completed attempts · Scores from different skills may not be directly
              comparable.
            </p>
          </div>
        </div>
        @if (s.trend.length) {
          <div
            class="chart"
            role="img"
            aria-label="Scores for the last ten completed attempts, also listed in the table below"
          >
            @for (t of s.trend; track t.id) {
              <div class="chart-column">
                <strong>{{ t.score }}%</strong>
                <div class="chart-bar" [style.height.px]="t.score * 1.65 + 4"></div>
                <small>{{ t.date | date: 'MMM d' }}</small>
              </div>
            }
          </div>
        } @else {
          <div class="empty">
            <h3>Your progress story is waiting.</h3>
            <p>Complete a mock test to see your results here.</p>
          </div>
        }
      </section>
      <div class="two-columns">
        <section class="panel">
          <h2>Performance by skill</h2>
          @for (b of s.bySkill; track b.skill) {
            <div class="skill-result">
              <div class="row-title">
                <strong>{{ b.skill }}</strong
                ><span>{{ b.score }}%</span>
              </div>
              <div class="progress"><span [style.width.%]="b.score"></span></div>
              <small>{{ b.correct }} correct / {{ b.total }} questions answered</small>
            </div>
          } @empty {
            <p class="muted">Skill-level performance appears after your first test.</p>
          }
        </section>
        <section class="panel">
          <h2>Learning beyond the test</h2>
          <div class="big-metric">{{ s.learningHours }} <small>hours logged</small></div>
          <p>{{ s.completedTopics }} topics completed</p>
          <div class="info-note">
            Test scores are one source of evidence. Your learning log and self-reported skills also
            contribute to career guidance.
          </div>
          <a routerLink="/learning" class="text-link">Update your learning log →</a>
        </section>
      </div>
      <section class="panel">
        <h2>Recent results</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Date</th>
                <th>Score</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              @for (t of s.trend.slice().reverse(); track t.id) {
                <tr>
                  <td>{{ t.title }}</td>
                  <td>{{ t.date | date: 'medium' }}</td>
                  <td>{{ t.score }}%</td>
                  <td><a [routerLink]="['/tests', t.id]" class="text-link">Review →</a></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">No completed tests yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }`,
})
export class Analytics extends PageState {
  api = inject(Api);
  stats = signal<any>(null);
  constructor() {
    super();
    this.run(async () => {
      this.stats.set(await this.api.request('/analytics'));
    });
  }
}
