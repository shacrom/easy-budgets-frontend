import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialRowComponent } from './material-row.component';
import { Material } from '../../../models/material.model';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('MaterialRowComponent', () => {
  let component: MaterialRowComponent;
  let fixture: ComponentFixture<MaterialRowComponent>;

  const mockMaterial: Material = {
    id: 1,
    reference: 'REF1',
    description: 'Desc',
    manufacturer: 'Manuf',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    orderIndex: 0
  };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('material', mockMaterial);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
