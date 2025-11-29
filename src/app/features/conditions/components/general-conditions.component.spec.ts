import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneralConditionsComponent } from './general-conditions.component';
import { CONDITION_TEMPLATES } from '../../../models/conditions.model';

describe('GeneralConditionsComponent', () => {
  let component: GeneralConditionsComponent;
  let fixture: ComponentFixture<GeneralConditionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralConditionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralConditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default conditions', () => {
    expect(component['conditions']().length).toBeGreaterThan(0);
  });

  it('should toggle edit mode', () => {
    component['toggleEditMode']();
    expect(component['editMode']()).toBeTrue();
    component['toggleEditMode']();
    expect(component['editMode']()).toBeFalse();
  });

  it('should update title', () => {
    const input = document.createElement('input');
    input.value = 'New Title';
    const event = { target: input } as any;

    component['updateTitle'](event);

    expect(component['title']()).toBe('New Title');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should change template', () => {
    const event = { target: { value: 'dica' } } as any;

    component['changeTemplate'](event);

    expect(component['selectedTemplate']()).toBe('dica');
    expect(component['conditions']().length).toBeGreaterThan(0);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should add condition', () => {
    const initialLength = component['conditions']().length;
    component['addCondition']();

    expect(component['conditions']().length).toBe(initialLength + 1);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should update condition field', () => {
    const condition = component['conditions']()[0];
    const input = document.createElement('input');
    input.value = 'Updated Text';
    const event = { target: input } as any;

    component['updateConditionField'](condition.id, 'text', event);

    const updatedCondition = component['conditions']().find(c => c.id === condition.id);
    expect(updatedCondition?.text).toBe('Updated Text');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should delete condition', () => {
    const initialLength = component['conditions']().length;
    const conditionToDelete = component['conditions']()[0];

    component['deleteCondition'](conditionToDelete.id);

    expect(component['conditions']().length).toBe(initialLength - 1);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should reset to template', () => {
    // Modify conditions first
    component['addCondition']();
    expect(component['hasUnsavedChanges']()).toBeTrue();

    component['resetToTemplate']();

    const template = CONDITION_TEMPLATES.find(t => t.id === component['selectedTemplate']());
    expect(component['conditions']().length).toBe(template?.conditions.length || 0);
  });

  it('should save changes', () => {
    spyOn(component.titleChanged, 'emit');
    spyOn(component.conditionsChanged, 'emit');

    component['title'].set('Saved Title');
    component.saveChanges();

    expect(component.titleChanged.emit).toHaveBeenCalledWith('Saved Title');
    expect(component.conditionsChanged.emit).toHaveBeenCalled();
    expect(component['hasUnsavedChanges']()).toBeFalse();
    expect(component['originalTitle']()).toBe('Saved Title');
  });

  it('should discard changes', () => {
    const originalTitle = component['title']();
    component['title'].set('Changed Title');
    component['hasUnsavedChanges'].set(true);

    component.discardChanges();

    expect(component['title']()).toBe(originalTitle);
    expect(component['hasUnsavedChanges']()).toBeFalse();
  });
});
