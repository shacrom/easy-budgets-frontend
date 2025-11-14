import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/presupuestos',
    pathMatch: 'full'
  },
  {
    path: 'presupuestos',
    loadComponent: () => import('./features/budgets/components/budgets-list.component').then(m => m.BudgetsListComponent)
  },
  {
    path: 'presupuestos/:id',
    loadComponent: () => import('./features/budget-editor/components/budget-editor.component').then(m => m.BudgetEditorComponent)
  },
  {
    path: 'productos',
    loadComponent: () => import('./features/products/components/products-catalog.component').then(m => m.ProductsCatalogComponent)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./features/customers/components/customers-page.component').then(m => m.CustomersPageComponent)
  }
];
