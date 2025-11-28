import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';

describe('BudgetTextBlockComponent', () => {
  let component: BudgetTextBlockComponent;
  let fixture: ComponentFixture<BudgetTextBlockComponent>;

  const mockBlock: BudgetTextBlock = {
    id: 1,
    budgetId: 1,
    sectionTitle: 'Test Section',
    heading: 'Test Header',
    descriptions: [],
    imageUrl: undefined,
    link: undefined,
    subtotal: 100,
    orderIndex: 0
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetTextBlockComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetTextBlockComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('block', mockBlock);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with input block', () => {
    expect(component.block()).toEqual(mockBlock);
  });
});
