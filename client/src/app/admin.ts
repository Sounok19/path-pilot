import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api, PageState } from './api';
import { Notice } from './shared';
import { ActivatedRoute } from '@angular/router';
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">PATH PILOT ADMINISTRATION</span>
        <h1>Help students move forward.</h1>
        <p>Review system activity and maintain the local practice question bank.</p>
      </div>
    </div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    @if (stats(); as s) {
      <div class="stats-grid">
        <article class="stat">
          <span>REGISTERED STUDENTS</span><strong>{{ s.students }}</strong>
        </article>
        <article class="stat">
          <span>ACTIVE QUESTIONS</span><strong>{{ s.questions }}</strong>
        </article>
        <article class="stat">
          <span>COMPLETED TESTS</span><strong>{{ s.attempts }}</strong>
        </article>
        <article class="stat">
          <span>AVERAGE SCORE</span><strong>{{ s.averageScore }}<small>%</small></strong>
        </article>
      </div>
    }
    <section class="panel">
      <h2>{{ editId ? 'Edit question' : 'Add a practice question' }}</h2>
      <form (ngSubmit)="saveQuestion()" #f="ngForm">
        <div class="form-grid">
          <label
            >Skill<select name="skill" [(ngModel)]="draft.skill">
              @for (s of catalog()?.skillNames; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select></label
          ><label
            >Availability<select name="active" [(ngModel)]="draft.active">
              <option [ngValue]="true">Active</option>
              <option [ngValue]="false">Inactive</option>
            </select></label
          >
        </div>
        <label
          >Question<input
            name="prompt"
            [(ngModel)]="draft.prompt"
            required
            minlength="10"
            maxlength="600"
        /></label>
        <div class="form-grid">
          @for (i of [0, 1, 2, 3]; track i) {
            <label
              >Option {{ i + 1
              }}<input
                [name]="'option' + i"
                [(ngModel)]="draft.options[i]"
                required
                maxlength="250"
            /></label>
          }
        </div>
        <label
          >Correct option<select name="correct" [(ngModel)]="draft.correctIndex">
            @for (i of [0, 1, 2, 3]; track i) {
              <option [ngValue]="i">Option {{ i + 1 }}</option>
            }
          </select></label
        ><label
          >Explanation<textarea
            name="explanation"
            [(ngModel)]="draft.explanation"
            required
            minlength="5"
            maxlength="1000"
          ></textarea>
        </label>
        <div class="inline-form">
          <button class="button primary" [disabled]="f.invalid || loading()">
            {{ editId ? 'Save changes' : 'Add question' }}
          </button>
          @if (editId) {
            <button type="button" class="button subtle" (click)="reset()">Cancel edit</button>
          }
        </div>
      </form>
    </section>
    <section class="panel">
      <div class="section-heading">
        <h2>Question bank</h2>
        <span class="tag">{{ questions().length }} QUESTIONS</span>
      </div>
      <p class="muted">
        Deactivate questions to remove them from future tests. Existing attempts keep their original
        questions and answers.
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Skill</th>
              <th>Status</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            @for (q of questions(); track q._id) {
              <tr>
                <td>{{ q.prompt }}</td>
                <td>{{ q.skill }}</td>
                <td>{{ q.active ? 'Active' : 'Inactive' }}</td>
                <td><button class="text-button" (click)="edit(q)">Edit</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <h2>Student directory</h2>
      <p class="muted">
        Most recent 200 students. Student profiles and detailed test answers stay in their own
        workspaces.
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            @for (s of students(); track s._id) {
              <tr>
                <td>{{ s.name }}</td>
                <td>{{ s.email }}</td>
                <td>{{ s.createdAt | date: 'mediumDate' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>`,
})
export class Admin extends PageState {
  api = inject(Api);
  route = inject(ActivatedRoute);
  stats = signal<any>(null);
  catalog = signal<any>(null);
  questions = signal<any[]>([]);
  students = signal<any[]>([]);
  editId = '';
  draft = this.empty();
  constructor() {
    super();
    this.run(async () => {
      await this.load();
      const skill = this.route.snapshot.queryParamMap.get('skill');
      if (this.catalog()?.skillNames.includes(skill)) this.draft.skill = skill!;
    });
  }
  empty() {
    return {
      skill: 'JavaScript',
      prompt: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
      active: true,
    };
  }
  async load() {
    const [s, c, q, u] = await Promise.all([
      this.api.request('/admin/overview'),
      this.api.request('/catalog'),
      this.api.request<any[]>('/admin/questions'),
      this.api.request<any[]>('/admin/students'),
    ]);
    this.stats.set(s);
    this.catalog.set(c);
    this.questions.set(q);
    this.students.set(u);
  }
  edit(q: any) {
    this.editId = q._id;
    const { skill, prompt, options, correctIndex, explanation, active } = q;
    this.draft = { skill, prompt, options: [...options], correctIndex, explanation, active };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  reset() {
    this.editId = '';
    this.draft = this.empty();
  }
  saveQuestion() {
    this.run(async () => {
      await this.api.request(
        '/admin/questions' + (this.editId ? '/' + this.editId : ''),
        this.editId ? 'PUT' : 'POST',
        this.draft,
      );
      this.reset();
      await this.load();
      this.success.set('Question saved.');
    });
  }
}
