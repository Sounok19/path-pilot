import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, PageState, Profile } from './api';
import { Notice } from './shared';
@Component({
  standalone: true,
  imports: [FormsModule, Notice],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">THE STARTING POINT</span>
        <h1>Make it yours.</h1>
        <p>Your academic background and interests help shape your guidance.</p>
      </div>
    </div>
    <app-notice [error]="error()" [success]="success()" [loading]="loading()" />
    @if (profile(); as p) {
      <form (ngSubmit)="save()" #f="ngForm">
        <div class="two-columns profile-columns">
          <section class="panel">
            <h2>Academic profile</h2>
            <div class="identity">
              <span class="avatar large">{{ api.user()?.name?.charAt(0) }}</span>
              <div>
                <h3>{{ api.user()?.name }}</h3>
                <p>{{ api.user()?.email }}</p>
              </div>
            </div>
            <label
              >College / institution<input
                [(ngModel)]="p.college"
                name="college"
                maxlength="120"
                placeholder="Your college" /></label
            ><label
              >Degree / programme<input
                [(ngModel)]="p.degree"
                name="degree"
                maxlength="100"
                placeholder="e.g. B.Tech Computer Science"
            /></label>
            <div class="form-grid">
              <label
                >Year of study<input
                  type="number"
                  [(ngModel)]="p.year"
                  name="year"
                  min="1"
                  max="8"
                  required /></label
              ><label
                >CGPA (out of 10)<input
                  type="number"
                  [(ngModel)]="p.cgpa"
                  name="cgpa"
                  min="0"
                  max="10"
                  step="0.01"
                  required
                /><small>Use 0 if not available.</small></label
              >
            </div>
            <label
              >About you<textarea
                [(ngModel)]="p.bio"
                name="bio"
                maxlength="800"
                rows="4"
                placeholder="What are you curious about? What are you working towards?"
              ></textarea>
            </label>
          </section>
          <section class="panel">
            <span class="eyebrow">FOLLOW YOUR CURIOSITY</span>
            <h2>Career interests</h2>
            <label>Career for my roadmap<select name="careerFocus" [(ngModel)]="p.careerFocus">
              <option value="">I’m still exploring</option>
              @for (c of catalog()?.careers; track c.id) { <option [value]="c.id">{{ c.title }}</option> }
            </select><small>Choose a direction when you are ready. Your subscription never assigns a career.</small></label>
            <p class="muted">
              Select the paths you’d like to explore. You can change these at any time.
            </p>
            @for (c of catalog()?.careers; track c.id) {
              <label class="check-card"
                ><input
                  type="checkbox"
                  [checked]="p.interests.includes(c.id)"
                  (change)="toggle(c.id)"
                /><span
                  ><strong>{{ c.title }}</strong
                  ><small>{{ c.field }}</small></span
                ></label
              >
            }
            <div class="info-note">
              Your profile stays in your account. Self-reported information supports learning
              recommendations; it is not a formal career assessment.
            </div>
          </section>
        </div>
        <div class="save-bar">
          <span>Save after making changes to your profile.</span
          ><button class="button primary" [disabled]="f.invalid || loading()">
            Save profile ↗
          </button>
        </div>
      </form>
    }`,
})
export class ProfilePage extends PageState {
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
  toggle(id: string) {
    const p = this.profile()!;
    p.interests = p.interests.includes(id)
      ? p.interests.filter((i) => i !== id)
      : [...p.interests, id];
  }
  save() {
    this.run(async () => {
      this.profile.set(await this.api.saveProfile(this.profile()!));
      this.success.set('Profile saved. Your guidance is up to date.');
    });
  }
}
