import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Condition, DEFAULT_CONDITIONS, CONDITION_TEMPLATES, TemplateType } from '../../../models/conditions.model';

/**
 * Componente para gestionar las condiciones generales del presupuesto
 * Permite editar, añadir y eliminar condiciones, y seleccionar plantillas predefinidas
 */
@Component({
  selector: 'app-general-conditions',
  templateUrl: './general-conditions.component.html',
  styleUrls: ['./general-conditions.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralConditionsComponent {
  // Título de la sección (ahora editable)
  protected readonly titulo = signal<string>('CONDICIONES GENERALES');

  // Lista de condiciones
  protected readonly condiciones = signal<Condition[]>([...DEFAULT_CONDITIONS]);

  // Modo de edición
  protected readonly editMode = signal<boolean>(false);

  // Plantilla seleccionada actualmente
  protected readonly selectedTemplate = signal<TemplateType>('general');

  // Plantillas disponibles
  protected readonly templates = CONDITION_TEMPLATES;

  /**
   * Alterna el modo de edición
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Actualiza el título de la sección
   */
  protected updateTitulo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.titulo.set(input.value);
  }

  /**
   * Cambia la plantilla de condiciones
   */
  protected changeTemplate(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const templateId = select.value as TemplateType;

    const template = CONDITION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      this.selectedTemplate.set(templateId);
      this.condiciones.set([...template.conditions]);
    }
  }

  /**
   * Añade una nueva condición vacía
   */
  protected addCondition(): void {
    const newCondition: Condition = {
      id: this.generateId(),
      titulo: '',
      texto: ''
    };

    this.condiciones.update(conds => [...conds, newCondition]);
  }

  /**
   * Actualiza una condición existente
   */
  protected updateCondition(updatedCondition: Condition): void {
    this.condiciones.update(conds =>
      conds.map(cond => cond.id === updatedCondition.id ? updatedCondition : cond)
    );
  }

  /**
   * Actualiza un campo específico de una condición
   */
  protected updateConditionField(conditionId: string, field: 'titulo' | 'texto', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.condiciones.update(conds =>
      conds.map(cond =>
        cond.id === conditionId
          ? { ...cond, [field]: input.value }
          : cond
      )
    );
  }

  /**
   * Elimina una condición
   */
  protected deleteCondition(conditionId: string): void {
    this.condiciones.update(conds => conds.filter(cond => cond.id !== conditionId));
  }

  /**
   * Restaura la plantilla seleccionada actualmente
   */
  protected resetToTemplate(): void {
    const template = CONDITION_TEMPLATES.find(t => t.id === this.selectedTemplate());
    if (template) {
      this.condiciones.set([...template.conditions]);
    }
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `condition-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
