import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-brand">
          <h1 class="navbar-title">ENTRECUINES</h1>
          <p class="navbar-subtitle">Sistema de Presupuestos</p>
        </div>
        <div class="navbar-links">
          <a
            routerLink="/presupuestos"
            routerLinkActive="active"
            class="nav-link">
            PRESUPUESTOS
          </a>
          <a
            routerLink="/productos"
            routerLinkActive="active"
            class="nav-link">
            CATÁLOGO
          </a>
          <a
            routerLink="/clientes"
            routerLinkActive="active"
            class="nav-link">
            CLIENTES
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    @import "tailwindcss";

    .navbar {
      @apply bg-white shadow-sm border-b border-gray-200;
    }

    .navbar-container {
      @apply max-w-7xl mx-auto px-8 py-6 flex justify-between items-center;
    }

    .navbar-brand {
      @apply flex flex-col;
    }

    .navbar-title {
      @apply text-3xl font-light tracking-widest text-gray-800;
      font-family: 'Arial', sans-serif;
      letter-spacing: 0.15em;
    }

    .navbar-subtitle {
      @apply text-xs text-gray-500 uppercase tracking-wide mt-1;
      letter-spacing: 0.1em;
    }

    .navbar-links {
      @apply flex gap-8;
    }

    .nav-link {
      @apply text-sm font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 transition-colors relative;
      letter-spacing: 0.1em;
      padding-bottom: 2px;
    }

    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 2px;
      background-color: #1f2937;
      transition: width 0.3s ease;
    }

    .nav-link:hover::after {
      width: 100%;
    }

    .nav-link.active {
      @apply text-gray-900;
    }

    .nav-link.active::after {
      width: 100%;
      background-color: #1f2937;
    }
  `]
})
export class NavbarComponent {}
