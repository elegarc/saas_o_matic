import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'customers',
    pathMatch: 'full',
  },
  {
    path: 'customers',
    loadComponent: () =>
      import(
        './features/customers/customer-dashboard/customer-dashboard.component'
      ).then((m) => m.CustomerDashboardComponent),
  },
  {
    path: 'customers/:customerId',
    loadComponent: () =>
      import(
        './features/customers/customer-detail/customer-detail.component'
      ).then((m) => m.CustomerDetailComponent),
  },
  {
    path: 'customers/:customerId/simulate',
    loadComponent: () =>
      import(
        './features/simulations/simulation-page/simulation-page.component'
      ).then((m) => m.SimulationPageComponent),
  },
  {
    path: '**',
    redirectTo: 'customers',
  },
];
