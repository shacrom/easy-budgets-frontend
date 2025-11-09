import { Component } from '@angular/core';
import { BudgetTextBlocksComponent } from './features/budgets/components/budget-text-blocks.component';

@Component({
  selector: 'app-root',
  imports: [BudgetTextBlocksComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'easy-budgets-frontend';
}
