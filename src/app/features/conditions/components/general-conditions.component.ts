import { ChangeDetectionStrategy, Component, signal, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Condition, DEFAULT_CONDITIONS, CONDITION_TEMPLATES, TemplateType } from '../../../models/conditions.model';

/**
 * Component to manage budget general conditions
 * Allows editing, adding and deleting conditions, and selecting predefined templates
 */
@Component({
  selector: 'app-general-conditions',
  templateUrl: './general-conditions.component.html',
  styleUrls: ['./general-conditions.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralConditionsComponent {
  // Section title (now editable)
  protected readonly title = signal<string>('CONDICIONES GENERALES');

  // List of conditions
  protected readonly conditions = signal<Condition[]>([...DEFAULT_CONDITIONS]);

  // Edit mode
  protected readonly editMode = signal<boolean>(false);

  // Currently selected template
  protected readonly selectedTemplate = signal<TemplateType>('general');

  // Available templates
  protected readonly templates = CONDITION_TEMPLATES;

  // Outputs to notify parent components
  readonly titleChanged = output<string>();
  readonly conditionsChanged = output<Condition[]>();

  constructor() {
    effect(() => {
      this.titleChanged.emit(this.title());
    });

    effect(() => {
      this.conditionsChanged.emit(this.conditions());
    });
  }

  /**
   * Toggles edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Updates the section title
   */
  protected updateTitle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.title.set(input.value);
  }

  /**
   * Changes the conditions template
   */
  protected changeTemplate(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const templateId = select.value as TemplateType;

    const template = CONDITION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      this.selectedTemplate.set(templateId);
      this.conditions.set([...template.conditions]);
    }
  }

  /**
   * Adds a new empty condition
   */
  protected addCondition(): void {
    const newCondition: Condition = {
      id: this.generateId(),
      title: '',
      text: ''
    };

    this.conditions.update(conds => [...conds, newCondition]);
  }

  /**
   * Updates an existing condition
   */
  protected updateCondition(updatedCondition: Condition): void {
    this.conditions.update(conds =>
      conds.map(cond => cond.id === updatedCondition.id ? updatedCondition : cond)
    );
  }

  /**
   * Updates a specific field of a condition
   */
  protected updateConditionField(conditionId: string, field: 'title' | 'text', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.conditions.update(conds =>
      conds.map(cond =>
        cond.id === conditionId
          ? { ...cond, [field]: input.value }
          : cond
      )
    );
  }

  /**
   * Deletes a condition
   */
  protected deleteCondition(conditionId: string): void {
    this.conditions.update(conds => conds.filter(cond => cond.id !== conditionId));
  }

  /**
   * Restores the currently selected template
   */
  protected resetToTemplate(): void {
    const template = CONDITION_TEMPLATES.find(t => t.id === this.selectedTemplate());
    if (template) {
      this.conditions.set([...template.conditions]);
    }
  }

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return `condition-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
