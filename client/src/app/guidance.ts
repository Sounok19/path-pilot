import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, PageState } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [RouterLink, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">TURN INSIGHT INTO ACTION</span>
        <h1>A roadmap that grows with you.</h1>
        <p>Explore possible careers and the skills that can help you get there.</p>
      </div>
      <a routerLink="/goals" class="button subtle">Set a career goal ↗</a>
    </div>
    <app-notice [error]="error()" [loading]="loading()" />
    @if (data(); as d) {
      <section class="panel action-plan">
        <span class="eyebrow">YOUR NEXT STEPS</span>
        <h2>Start here. Keep going.</h2>
        <ol>
          @for (action of d.actions; track action) {
            <li>{{ action }}</li>
          }
        </ol>
      </section>
      <div class="info-note">{{ d.method }}</div>
      @for (c of d.careers; track c.id) {
        <section class="panel career-detail">
          <div class="section-heading">
            <div>
              <span class="tag"
                >{{ c.field }}{{ c.isGoal ? ' · ACTIVE GOAL' : ''
                }}{{ c.interested ? ' · YOUR INTEREST' : '' }}</span
              >
              <h2>{{ c.title }}</h2>
              <p class="muted">{{ c.description }}</p>
            </div>
            <div class="career-score">
              <strong>{{ c.readiness }}<small>%</small></strong
              ><span>learning readiness</span>
            </div>
          </div>
          <details [open]="c.id === d.recommendedCareerId">
            <summary>Skill gaps & recommended resources</summary>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Estimated / target</th>
                    <th>Gap</th>
                    <th>Evidence</th>
                    <th>Learn next</th>
                  </tr>
                </thead>
                <tbody>
                  @for (g of c.gaps; track g.skill) {
                    <tr>
                      <td>
                        <strong>{{ g.skill }}</strong>
                        <div class="progress"><span [style.width.%]="g.current"></span></div>
                      </td>
                      <td>{{ g.current }} / {{ g.target }}</td>
                      <td>
                        <span class="tag" [class.attention]="g.gap > 0">{{
                          g.gap > 0 ? g.gap + ' points' : 'Target met'
                        }}</span>
                      </td>
                      <td>
                        <small
                          >Self: {{ g.self }} · Topics: {{ g.progress === null ? '—' : g.progress
                          }}<br />Tests: {{ g.testScore === null ? '—' : g.testScore }}</small
                        >
                      </td>
                      <td>
                        @if (g.resource) {
                          <a
                            [href]="g.resource.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-link"
                            >{{ g.resource.provider }} ↗</a
                          >
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
        </section>
      }
      <p class="muted">
        Resources open on external sites. Availability and any course costs are controlled by their
        providers.
      </p>
    }`,
})
export class Guidance extends PageState {
  api = inject(Api);
  data = signal<any>(null);
  constructor() {
    super();
    this.run(async () => {
      this.data.set(await this.api.request('/guidance'));
    });
  }
}
