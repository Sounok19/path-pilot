import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
}
export interface Skill {
  name: string;
  level: number;
  development: string;
}
export interface Topic {
  id: string;
  title: string;
  skill: string;
  progress: number;
  hours: number;
}
export interface Goal {
  id: string;
  careerId: string;
  targetDate: string;
  status: string;
  notes: string;
}
export interface Profile {
  version: number;
  college: string;
  degree: string;
  year: number;
  cgpa: number;
  bio: string;
  interests: string[];
  careerFocus: string;
  skills: Skill[];
  topics: Topic[];
  goals: Goal[];
}
@Injectable({ providedIn: 'root' })
export class Api {
  user = signal<User | null>(null);
  private checked = false;
  private router = inject(Router);
  async request<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'PathPilot' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data: any = null;
    if (response.status !== 204) {
      // A disconnected tunnel may return an HTML error page instead of API JSON.
      const connectionMessage = 'The app connection was interrupted. Refresh this page and try again. Make sure you are using the latest shared link.';
      if (!response.headers.get('Content-Type')?.includes('application/json')) {
        throw new Error(connectionMessage);
      }
      try { data = await response.json(); }
      catch { throw new Error(connectionMessage); }
    }
    if (!response.ok) {
      if (data?.code === 'SUBSCRIPTION_REQUIRED') void this.router.navigate(['/explore'], { queryParams: { required: 'true' } });
      if (response.status === 401) this.user.set(null);
      throw new Error(data?.message || 'Could not complete your request.');
    }
    return data as T;
  }
  async session() {
    if (!this.checked) {
      try {
        this.user.set(await this.request<User>('/auth/me'));
      } catch {
        this.user.set(null);
      }
      this.checked = true;
    }
    return this.user();
  }
  async login(data: unknown, register = false) {
    const user = await this.request<User>(
      register ? '/auth/register' : '/auth/login',
      'POST',
      data,
    );
    this.checked = true;
    this.user.set(user);
    return user;
  }
  async logout() {
    await this.request('/auth/logout', 'POST');
    this.user.set(null);
    this.checked = true;
  }
  saveProfile(p: Profile) {
    const { version, college, degree, year, cgpa, bio, interests, careerFocus, skills, topics, goals } = p;
    return this.request<Profile>('/profile', 'PUT', {
      version,
      college,
      degree,
      year,
      cgpa,
      bio,
      interests,
      careerFocus: careerFocus || '',
      skills,
      topics,
      goals,
    });
  }
}
export class PageState {
  loading = signal(false);
  error = signal('');
  success = signal('');
  async run(action: () => Promise<void>) {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Connection failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
