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

  // Manual save pattern
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Store original state for discard
  private readonly originalTitle = signal<string>('CONDICIONES GENERALES');
  private readonly originalConditions = signal<Condition[]>([...DEFAULT_CONDITIONS]);

  // Outputs to notify parent components (only on manual save)
  readonly titleChanged = output<string>();
  readonly conditionsChanged = output<Condition[]>();

  constructor() {
    // No automatic effects - removed all auto-emit logic
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
    this.hasUnsavedChanges.set(true);
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
      this.hasUnsavedChanges.set(true);
    }
  }

  /**
   * Adds a new empty condition
   */
  private nextClientId = -1;

  protected addCondition(): void {
    const newCondition: Condition = {
      id: this.generateId(),
      title: '',
      text: ''
    };

    this.conditions.update(conds => [...conds, newCondition]);
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Updates an existing condition
   */
  protected updateCondition(updatedCondition: Condition): void {
    this.conditions.update(conds =>
      conds.map(cond => cond.id === updatedCondition.id ? updatedCondition : cond)
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Updates a specific field of a condition
   */
  protected updateConditionField(conditionId: number, field: 'title' | 'text', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.conditions.update(conds =>
      conds.map(cond =>
        cond.id === conditionId
          ? { ...cond, [field]: input.value }
          : cond
      )
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes a condition
   */
  protected deleteCondition(conditionId: number): void {
    this.conditions.update(conds => conds.filter(cond => cond.id !== conditionId));
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Restores the currently selected template
   */
  protected resetToTemplate(): void {
    const template = CONDITION_TEMPLATES.find(t => t.id === this.selectedTemplate());
    if (template) {
      this.conditions.set([...template.conditions]);
      this.hasUnsavedChanges.set(true);
    }
  }

  /**
   * Saves all changes and emits to parent
   */
  saveChanges(): void {
    this.isSaving.set(true);

    // Update original state
    this.originalTitle.set(this.title());
    this.originalConditions.set(this.conditions());

    // Emit to parent
    this.titleChanged.emit(this.title());
    this.conditionsChanged.emit(this.conditions());

    this.hasUnsavedChanges.set(false);
    this.isSaving.set(false);
  }

  /**
   * Discards all changes and restores original state
   */
  discardChanges(): void {
    this.title.set(this.originalTitle());
    this.conditions.set(this.originalConditions());
    this.hasUnsavedChanges.set(false);
  }

  /**
   * Generates a unique ID
   */
  private generateId(): number {
    return this.nextClientId--;
  }
}
