import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, PageState, Profile } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [RouterLink, Notice],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">YOUR PERSONAL ROADMAP</span>
        <h1>A little progress, every day.</h1>
        <p>
          Good to see you, {{ api.user()?.name?.split(' ')?.[0] }}. Let’s move your future forward.
        </p>
      </div>
      <a class="button subtle" routerLink="/profile">Edit profile ↗</a>
    </div>
    <app-notice [error]="error()" [loading]="loading()" />
    @if (data(); as d) {
      <section class="hero">
        <div>
          <span class="eyebrow light">YOUR NEXT CHAPTER</span>
          <h2>{{ d.goal?.title || 'Find a path that feels like you.' }}</h2>
          <p>
            {{
              d.goal
                ? 'Keep building the skills that bring this goal within reach.'
                : 'Add your skills, choose a goal, and discover where to focus next.'
            }}
          </p>
          <a routerLink="/guidance" class="button lime">Explore my roadmap <span>↗</span></a>
        </div>
        <div class="hero-orbit">
          <div class="readiness-ring" [style.--value]="d.goal?.readiness || 0">
            <span
              ><strong>{{ d.goal?.readiness || 0 }}<small>%</small></strong
              ><em>learning readiness</em></span
            >
          </div>
          <small>Based on your recorded evidence</small>
        </div>
      </section>
      <div class="stats-grid">
        <article class="stat">
          <span>SKILLS IN YOUR TOOLKIT</span
          ><strong>{{ d.profile.skills.length }}<small>skills</small></strong>
          <p>Every skill opens a new door</p>
        </article>
        <article class="stat">
          <span>LEARNING PROGRESS</span><strong>{{ d.stats.topicProgress }}<small>%</small></strong>
          <p>{{ d.stats.completedTopics }} topics completed</p>
        </article>
        <article class="stat">
          <span>AVERAGE TEST SCORE</span
          ><strong
            >{{ d.stats.attempts ? d.stats.averageScore : '—'
            }}<small>{{ d.stats.attempts ? '%' : 'no tests yet' }}</small></strong
          >
          <p>{{ d.stats.attempts }} practice tests completed</p>
        </article>
        <article class="stat">
          <span>TIME WELL SPENT</span
          ><strong>{{ d.stats.learningHours }}<small>hours</small></strong>
          <p>Learning you’ve logged so far</p>
        </article>
      </div>
      <div class="two-columns">
        <section class="panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow">KEEP YOUR MOMENTUM</span>
              <h2>Continue learning</h2>
            </div>
            <a routerLink="/learning" class="text-link">View all ↗</a>
          </div>
          @for (t of d.profile.topics.slice(0, 3); track t.id) {
            <div class="learning-row">
              <span class="topic-symbol">{{ t.progress === 100 ? '✓' : '↗' }}</span>
              <div class="grow">
                <div class="row-title">
                  <strong>{{ t.title }}</strong
                  ><span>{{ t.progress }}%</span>
                </div>
                <small>{{ t.skill }} · {{ t.hours }} hours logged</small>
                <div class="progress"><span [style.width.%]="t.progress"></span></div>
              </div>
            </div>
          } @empty {
            <div class="empty">
              <h3>Your learning log starts here.</h3>
              <p>Add the first topic you’re working on.</p>
              <a routerLink="/learning" class="button subtle">Add a topic</a>
            </div>
          }
        </section>
        <section class="panel next-panel">
          <span class="eyebrow">MAKE YOUR NEXT MOVE</span>
          <h2>A clear next step.</h2>
          <p>{{ d.guidance.actions[0] }}</p>
          <div class="next-step-icon">↗</div>
          <a class="text-link" routerLink="/guidance">See your personalized plan →</a>
        </section>
      </div>
      <section class="panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">POSSIBILITIES AHEAD</span>
            <h2>Paths worth exploring</h2>
          </div>
          <a routerLink="/goals" class="text-link">Manage goals ↗</a>
        </div>
        <div class="career-grid">
          @for (c of d.guidance.careers.slice(0, 3); track c.id) {
            <a class="career-mini" routerLink="/guidance"
              ><span class="tag">{{ c.field }}</span>
              <h3>{{ c.title }}</h3>
              <p>{{ c.description }}</p>
              <div class="row-title">
                <small>{{ c.isGoal ? 'YOUR ACTIVE GOAL' : 'EXPLORE THIS PATH' }}</small
                ><strong>{{ c.readiness }}% ↗</strong>
              </div></a
            >
          }
        </div>
      </section>
    }`,
})
export class Dashboard extends PageState {
  api = inject(Api);
  data = signal<any>(null);
  constructor() {
    super();
    this.run(async () => {
      const [profile, stats, g] = await Promise.all([
        this.api.request<Profile>('/profile'),
        this.api.request('/analytics'),
        this.api.request('/guidance'),
      ]);
      this.data.set({ profile, stats, guidance: g, goal: g.careers.find((c: any) => c.isGoal) });
    });
  }
}
