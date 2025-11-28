import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneralConditionsComponent } from './general-conditions.component';

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
    expect((component as any).conditions().length).toBeGreaterThan(0);
  });

  it('should toggle edit mode', () => {
    (component as any).toggleEditMode();
    expect((component as any).editMode()).toBeTrue();
    (component as any).toggleEditMode();
    expect((component as any).editMode()).toBeFalse();
  });
});
