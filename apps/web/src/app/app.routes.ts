import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'pase/:code',
    loadComponent: () => import('./pages/pass-public.page').then((m) => m.PassPublicPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'grupos', loadComponent: () => import('./pages/groups.page').then((m) => m.GroupsPageComponent) },
      { path: 'grupos/:id', loadComponent: () => import('./pages/group-detail.page').then((m) => m.GroupDetailPageComponent) },
      {
        path: 'perros',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/dogs.page').then((m) => m.DogsPageComponent),
      },
      {
        path: 'perros/nuevo',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/dog-form.page').then((m) => m.DogFormPageComponent),
      },
      {
        path: 'perros/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/dog-form.page').then((m) => m.DogFormPageComponent),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'confirmacion/:code',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPageComponent),
      },
      {
        path: 'mis-visitas',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/visits.page').then((m) => m.VisitsPageComponent),
      },
      {
        path: 'mis-visitas/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/visit-detail.page').then((m) => m.VisitDetailPageComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent),
      },
      {
        path: 'cuenta',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/account.page').then((m) => m.AccountPageComponent),
      },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
