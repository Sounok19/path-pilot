import { Component, input } from '@angular/core';
@Component({
  selector: 'app-notice',
  standalone: true,
  template: `@if (error()) {
      <div class="notice error" role="alert">{{ error() }}</div>
    }
    @if (success()) {
      <div class="notice success" role="status">{{ success() }}</div>
    }
    @if (loading()) {
      <div class="loading" role="status">Working on it…</div>
    }`,
})
export class Notice {
  error = input('');
  success = input('');
  loading = input(false);
}
