import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/presupuestos',
    pathMatch: 'full'
  },
  {
    path: 'presupuestos',
    loadComponent: () => import('./features/budgets-list/components/budgets-list.component').then(m => m.BudgetsListComponent)
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
    path: 'emails',
    loadComponent: () => import('./features/budget-editor/sections/email-history/email-history-tab.component').then(m => m.EmailHistoryTabComponent)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./features/customers/components/customers-page.component').then(m => m.CustomersPageComponent)
  },
  {
    path: 'supplier-orders',
    loadComponent: () => import('./features/supplier-orders/components/supplier-orders-list.component').then(m => m.SupplierOrdersListComponent)
  },
  {
    path: 'supplier-orders/:id',
    loadComponent: () => import('./features/supplier-orders/components/supplier-order-editor.component').then(m => m.SupplierOrderEditorComponent)
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./features/suppliers/components/suppliers-page.component').then(m => m.SuppliersPageComponent)
  },
  {
    path: 'delivery-addresses',
    loadComponent: () => import('./features/delivery-addresses/components/delivery-addresses-page.component').then(m => m.DeliveryAddressesPageComponent)
  }
];
