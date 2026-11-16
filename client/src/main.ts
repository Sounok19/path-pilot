import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  CanActivateFn,
  Router,
  RouterOutlet,
  provideRouter,
  withInMemoryScrolling,
} from '@angular/router';
import { Api } from './app/api';
import { Shell } from './app/shell';
const access =
  (role?: 'student' | 'admin'): CanActivateFn =>
  async () => {
    const api = inject(Api),
      router = inject(Router);
    const user = await api.session();
    if (!user) return router.parseUrl('/login');
    return !role || user.role === role
      ? true
      : router.parseUrl(user.role === 'admin' ? '/admin' : '/dashboard');
  };
const subscribed: CanActivateFn = async (route) => {
  const api = inject(Api), router = inject(Router);
  try {
    const data = await api.request('/subscription');
    return data.membership.plan === 'premium' ? true : router.createUrlTree(['/explore'], { queryParams: { feature: route.routeConfig?.path?.split('/')[0] } });
  } catch { return router.parseUrl('/premium'); }
};
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet/>',
})
class App {}
bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      [
        { path: 'login', loadComponent: () => import('./app/auth').then((m) => m.AuthPage) },
        {
          path: '',
          component: Shell,
          canActivate: [access()],
          children: [
            { path: 'admin/skill-requests', canActivate: [access('admin')], loadComponent: () => import('./app/skill-requests-admin').then(m => m.SkillRequestsAdmin) },
            { path: 'explore', canActivate: [access('student')], loadComponent: () => import('./app/explore').then(m => m.Explore) },
            {
              path: 'dashboard',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/dashboard').then((m) => m.Dashboard),
            },
            {
              path: 'profile',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/profile').then((m) => m.ProfilePage),
            },
            {
              path: 'learning',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/learning').then((m) => m.Learning),
            },
            {
              path: 'goals',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/goals').then((m) => m.Goals),
            },
            {
              path: 'tests',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/tests').then((m) => m.Tests),
            },
            {
              path: 'tests/:id',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/tests').then((m) => m.AttemptPage),
            },
            {
              path: 'analytics',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/analytics').then((m) => m.Analytics),
            },
            {
              path: 'guidance',
              canActivate: [access('student'), subscribed],
              loadComponent: () => import('./app/guidance').then((m) => m.Guidance),
            },
            {
              path: 'premium',
              canActivate: [access('student')],
              loadComponent: () => import('./app/premium').then((m) => m.Premium),
            },
            {
              path: 'admin/payments',
              canActivate: [access('admin')],
              loadComponent: () => import('./app/payments-admin').then((m) => m.PaymentsAdmin),
            },
            {
              path: 'admin/enrollments',
              canActivate: [access('admin')],
              loadComponent: () => import('./app/enrollments').then((m) => m.Enrollments),
            },
            {
              path: 'admin',
              canActivate: [access('admin')],
              loadComponent: () => import('./app/admin').then((m) => m.Admin),
            },
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          ],
        },
        { path: '**', redirectTo: 'dashboard' },
      ],
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ],
}).catch(console.error);
