import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleBlockEditorComponent } from './simple-block-editor.component';
import { SupabaseService } from '../../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { SimpleBlock } from '../../../../models/simple-block.model';

describe('SimpleBlockEditorComponent', () => {
  let component: SimpleBlockEditorComponent;
  let fixture: ComponentFixture<SimpleBlockEditorComponent>;
  let supabaseServiceSpy: {
    getSimpleBlockForBudget: ReturnType<typeof vi.fn>;
    upsertSimpleBlock: ReturnType<typeof vi.fn>;
    uploadPublicAsset: ReturnType<typeof vi.fn>;
  };

  const mockSimpleBlock: SimpleBlock = {
    budgetId: 1,
    model: 'Test Model',
    description: 'Test Desc',
    price: 100,
    sectionTitle: 'Bloque Simple Test',
    imageUrl: 'http://example.com/image.jpg'
  };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = {
      getSimpleBlockForBudget: vi.fn(),
      upsertSimpleBlock: vi.fn(),
      uploadPublicAsset: vi.fn()
    };

    supabaseServiceSpy.getSimpleBlockForBudget.mockReturnValue(Promise.resolve(mockSimpleBlock));
    supabaseServiceSpy.upsertSimpleBlock.mockReturnValue(Promise.resolve(mockSimpleBlock));
    supabaseServiceSpy.uploadPublicAsset.mockReturnValue(Promise.resolve({
      publicUrl: 'http://new-image.com/img.jpg',
      path: 'simple-blocks/1/test.jpg'
    }));

    await TestBed.configureTestingModule({
      imports: [SimpleBlockEditorComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleBlockEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load simple block data when budgetId is provided', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(supabaseServiceSpy.getSimpleBlockForBudget).toHaveBeenCalledWith(1);
    expect(component['simpleBlock']()).toEqual(mockSimpleBlock);
    expect(component['sectionTitle']()).toBe('Bloque Simple Test');
    expect(component['hasUnsavedChanges']()).toBe(false);
  });

  it('should handle loading empty simple block', async () => {
    supabaseServiceSpy.getSimpleBlockForBudget.mockReturnValue(Promise.resolve(null));
    fixture.componentRef.setInput('budgetId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['simpleBlock']().budgetId).toBe(2);
    expect(component['simpleBlock']().price).toBe(0);
    expect(component['sectionTitle']()).toBe('Bloque Simple'); // Default title
  });

  it('should update fields and mark as unsaved', () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    component.updateModel('New Model');
    expect(component['simpleBlock']().model).toBe('New Model');
    expect(component['hasUnsavedChanges']()).toBe(true);

    component.updateDescription('New Desc');
    expect(component['simpleBlock']().description).toBe('New Desc');

    component.updatePrice(200);
    expect(component['simpleBlock']().price).toBe(200);
  });

  it('should update section title', () => {
    const event = { target: { value: 'New Title' } } as any;
    component['updateSectionTitle'](event);

    expect(component['sectionTitle']()).toBe('New Title');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should save changes', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateModel('Updated Model');

    const savedSimpleBlock = { ...mockSimpleBlock, model: 'Updated Model' };
    supabaseServiceSpy.upsertSimpleBlock.mockReturnValue(Promise.resolve(savedSimpleBlock));

    let emittedTotal: number | undefined;
    component.totalChanged.subscribe(val => emittedTotal = val);

    await component.saveChanges();

    expect(supabaseServiceSpy.upsertSimpleBlock).toHaveBeenCalled();
    expect(component['hasUnsavedChanges']()).toBe(false);
    expect(emittedTotal).toBe(100);
  });

  it('should discard changes', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateModel('Changed Model');
    expect(component['hasUnsavedChanges']()).toBe(true);

    component.discardChanges();

    expect(component['simpleBlock']().model).toBe('Test Model');
    expect(component['hasUnsavedChanges']()).toBe(false);
  });

  it('should handle image upload', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as any;

    await component['onImageFileSelected'](event);

    expect(supabaseServiceSpy.uploadPublicAsset).toHaveBeenCalled();
    expect(component['simpleBlock']().imageUrl).toBe('http://new-image.com/img.jpg');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should handle image upload error', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();

    supabaseServiceSpy.uploadPublicAsset.mockReturnValue(Promise.reject('Error'));
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as any;

    await component['onImageFileSelected'](event);

    expect(component['imageUploadError']()).toBeTruthy();
    expect(component['isUploadingImage']()).toBe(false);
  });

  it('should clear image url', () => {
    component.clearImageUrl();
    expect(component['simpleBlock']().imageUrl).toBeNull();
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should set image url manually', () => {
    component.setImageUrl('http://manual.com/img.jpg');
    expect(component['simpleBlock']().imageUrl).toBe('http://manual.com/img.jpg');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });
});
