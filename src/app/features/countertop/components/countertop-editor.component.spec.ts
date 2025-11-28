import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountertopEditorComponent } from './countertop-editor.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Countertop } from '../../../models/countertop.model';

describe('CountertopEditorComponent', () => {
  let component: CountertopEditorComponent;
  let fixture: ComponentFixture<CountertopEditorComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  const mockCountertop: Countertop = {
    budgetId: 1,
    model: 'Test Model',
    description: 'Test Desc',
    price: 100,
    sectionTitle: 'Encimera Test',
    imageUrl: 'http://example.com/image.jpg'
  };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getCountertopForBudget',
      'upsertCountertop',
      'uploadPublicAsset'
    ]);

    supabaseServiceSpy.getCountertopForBudget.and.returnValue(Promise.resolve(mockCountertop));
    supabaseServiceSpy.upsertCountertop.and.returnValue(Promise.resolve(mockCountertop));
    supabaseServiceSpy.uploadPublicAsset.and.returnValue(Promise.resolve({
      publicUrl: 'http://new-image.com/img.jpg',
      path: 'countertops/1/test.jpg'
    }));

    await TestBed.configureTestingModule({
      imports: [CountertopEditorComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CountertopEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load countertop data when budgetId is provided', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(supabaseServiceSpy.getCountertopForBudget).toHaveBeenCalledWith(1);
    expect(component['countertop']()).toEqual(mockCountertop);
    expect(component['sectionTitle']()).toBe('Encimera Test');
    expect(component['hasUnsavedChanges']()).toBeFalse();
  });

  it('should handle loading empty countertop', async () => {
    supabaseServiceSpy.getCountertopForBudget.and.returnValue(Promise.resolve(null));
    fixture.componentRef.setInput('budgetId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['countertop']().budgetId).toBe(2);
    expect(component['countertop']().price).toBe(0);
    expect(component['sectionTitle']()).toBe('Encimera'); // Default title
  });

  it('should update fields and mark as unsaved', () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    component.updateModel('New Model');
    expect(component['countertop']().model).toBe('New Model');
    expect(component['hasUnsavedChanges']()).toBeTrue();

    component.updateDescription('New Desc');
    expect(component['countertop']().description).toBe('New Desc');

    component.updatePrice(200);
    expect(component['countertop']().price).toBe(200);
  });

  it('should update section title', () => {
    const event = { target: { value: 'New Title' } } as any;
    component['updateSectionTitle'](event);

    expect(component['sectionTitle']()).toBe('New Title');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should save changes', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateModel('Updated Model');

    const savedCountertop = { ...mockCountertop, model: 'Updated Model' };
    supabaseServiceSpy.upsertCountertop.and.returnValue(Promise.resolve(savedCountertop));

    let emittedTotal: number | undefined;
    component.totalChanged.subscribe(val => emittedTotal = val);

    await component.saveChanges();

    expect(supabaseServiceSpy.upsertCountertop).toHaveBeenCalled();
    expect(component['hasUnsavedChanges']()).toBeFalse();
    expect(emittedTotal).toBe(100);
  });

  it('should discard changes', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateModel('Changed Model');
    expect(component['hasUnsavedChanges']()).toBeTrue();

    component.discardChanges();

    expect(component['countertop']().model).toBe('Test Model');
    expect(component['hasUnsavedChanges']()).toBeFalse();
  });

  it('should handle image upload', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as any;

    await component['onImageFileSelected'](event);

    expect(supabaseServiceSpy.uploadPublicAsset).toHaveBeenCalled();
    expect(component['countertop']().imageUrl).toBe('http://new-image.com/img.jpg');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should handle image upload error', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    supabaseServiceSpy.uploadPublicAsset.and.returnValue(Promise.reject('Error'));
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as any;

    await component['onImageFileSelected'](event);

    expect(component['imageUploadError']()).toBeTruthy();
    expect(component['isUploadingImage']()).toBeFalse();
  });

  it('should clear image url', () => {
    component.clearImageUrl();
    expect(component['countertop']().imageUrl).toBeNull();
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should set image url manually', () => {
    component.setImageUrl('http://manual.com/img.jpg');
    expect(component['countertop']().imageUrl).toBe('http://manual.com/img.jpg');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });
});
