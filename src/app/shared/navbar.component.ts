import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-brand">
          <h1 class="navbar-title">Easy Budgets</h1>
          <p class="navbar-subtitle">Sistema de Presupuestos</p>
        </div>
        <div class="navbar-links">
          <a
            routerLink="/presupuestos"
            routerLinkActive="active"
            class="nav-link">
            📝 Presupuestos
          </a>
          <a
            routerLink="/productos"
            routerLinkActive="active"
            class="nav-link">
            📦 Catálogo
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    @import "tailwindcss";

    .navbar {
      @apply bg-white shadow-md border-b-4 border-blue-600 mb-6;
    }

    .navbar-container {
      @apply container mx-auto px-6 py-4 flex justify-between items-center;
    }

    .navbar-brand {
      @apply flex flex-col;
    }

    .navbar-title {
      @apply text-2xl font-bold text-blue-700;
    }

    .navbar-subtitle {
      @apply text-sm text-gray-600;
    }

    .navbar-links {
      @apply flex gap-4;
    }

    .nav-link {
      @apply px-6 py-2 rounded-md font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors;
    }

    .nav-link.active {
      @apply bg-blue-600 text-white hover:bg-blue-700 hover:text-white;
    }
  `]
})
export class NavbarComponent {}
