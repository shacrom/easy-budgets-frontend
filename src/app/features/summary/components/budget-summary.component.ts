import { ChangeDetectionStrategy, Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetSummary, SummaryLine } from '../../../models/budget-summary.model';

/**
 * Componente para mostrar el resumen del presupuesto
 * Muestra el total de bloques, materiales, IVA y total general
 */
@Component({
  selector: 'app-budget-summary',
  templateUrl: './budget-summary.component.html',
  styleUrls: ['./budget-summary.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetSummaryComponent {
  // Inputs: totales de cada sección
  totalBloques = input<number>(0);
  totalMateriales = input<number>(0);

  // Estado local para configuración
  protected readonly porcentajeIva = signal<number>(21);
  protected readonly editMode = signal<boolean>(false);
  protected readonly lineasAdicionales = signal<SummaryLine[]>([]);

  // Cálculos derivados
  protected readonly subtotal = computed(() => {
    return this.totalBloques() + this.totalMateriales();
  });

  protected readonly totalLineasAdicionales = computed(() => {
    return this.lineasAdicionales().reduce((sum, linea) => sum + linea.importe, 0);
  });

  protected readonly baseImponible = computed(() => {
    return this.subtotal() + this.totalLineasAdicionales();
  });

  protected readonly iva = computed(() => {
    return this.baseImponible() * (this.porcentajeIva() / 100);
  });

  protected readonly totalGeneral = computed(() => {
    return this.baseImponible() + this.iva();
  });

  /**
   * Alterna el modo de edición
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Añade una nueva línea adicional (descuento, extra, etc.)
   */
  protected addLineaAdicional(): void {
    const newLine: SummaryLine = {
      id: this.generateId(),
      concepto: '',
      importe: 0
    };

    this.lineasAdicionales.update(lineas => [...lineas, newLine]);
  }

  /**
   * Actualiza una línea adicional
   */
  protected updateLineaAdicional(updatedLine: SummaryLine): void {
    this.lineasAdicionales.update(lineas =>
      lineas.map(linea => linea.id === updatedLine.id ? updatedLine : linea)
    );
  }

  /**
   * Elimina una línea adicional
   */
  protected deleteLineaAdicional(lineaId: string): void {
    this.lineasAdicionales.update(lineas => lineas.filter(linea => linea.id !== lineaId));
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
