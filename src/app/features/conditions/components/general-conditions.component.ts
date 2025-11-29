import { ChangeDetectionStrategy, Component, signal, effect, output, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Condition } from '../../../models/conditions.model';
import { SupabaseService } from '../../../services/supabase.service';

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
export class GeneralConditionsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  // Inputs
  readonly budgetId = input<number>(0);
  readonly initialConditions = input<Condition[]>([]);

  // Section title (now editable)
  protected readonly title = signal<string>('CONDICIONES GENERALES');

  // List of conditions
  protected readonly conditions = signal<Condition[]>([]);

  // Edit mode
  protected readonly editMode = signal<boolean>(false);

  // Currently selected template
  protected readonly selectedTemplateId = signal<number | null>(null);

  // Available templates
  protected readonly templates = signal<any[]>([]);

  // Manual save pattern
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Store original state for discard
  private readonly originalTitle = signal<string>('CONDICIONES GENERALES');
  private readonly originalConditions = signal<Condition[]>([]);

  // Outputs to notify parent components (only on manual save)
  readonly titleChanged = output<string>();
  readonly conditionsChanged = output<Condition[]>();

  constructor() {
    effect(() => {
      const initConds = this.initialConditions();
      if (initConds) {
        this.conditions.set([...initConds]);
        this.originalConditions.set([...initConds]);
      }
    }, { allowSignalWrites: true });
  }

  async ngOnInit() {
    await this.loadTemplates();
  }

  private async loadTemplates() {
    try {
      const templates = await this.supabase.getConditionTemplates();
      this.templates.set(templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
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
  protected async changeTemplate(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const templateId = Number(select.value);

    if (!templateId) return;

    this.selectedTemplateId.set(templateId);

    try {
      const sections = await this.supabase.getConditionTemplateSections(templateId);
      this.conditions.set(sections);
      this.hasUnsavedChanges.set(true);
    } catch (error) {
      console.error('Error loading template sections:', error);
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
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Updates an existing condition field
   */
  protected updateConditionField(id: number, field: 'title' | 'text', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = input.value;

    this.conditions.update(conds =>
      conds.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes a condition
   */
  protected deleteCondition(id: number): void {
    this.conditions.update(conds => conds.filter(c => c.id !== id));
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Saves changes
   */
  protected async saveChanges(): Promise<void> {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    try {
      const id = this.budgetId();
      if (id) {
        await this.supabase.saveBudgetConditions(id, this.conditions());
      }

      this.originalTitle.set(this.title());
      this.originalConditions.set([...this.conditions()]);
      this.hasUnsavedChanges.set(false);
      this.editMode.set(false);

      this.titleChanged.emit(this.title());
      this.conditionsChanged.emit(this.conditions());
    } catch (error) {
      console.error('Error saving conditions:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Discards changes
   */
  protected discardChanges(): void {
    this.title.set(this.originalTitle());
    this.conditions.set([...this.originalConditions()]);
    this.hasUnsavedChanges.set(false);
    this.editMode.set(false);
  }

  /**
   * Resets to the currently selected template (re-fetch)
   */
  protected async resetToTemplate(): Promise<void> {
    const templateId = this.selectedTemplateId();
    if (templateId) {
       try {
        const sections = await this.supabase.getConditionTemplateSections(templateId);
        this.conditions.set(sections);
        this.hasUnsavedChanges.set(true);
      } catch (error) {
        console.error('Error loading template sections:', error);
      }
    }
  }

  private generateId(): number {
    return -Math.floor(Math.random() * 1000000);
  }
}
