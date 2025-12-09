import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { AppComponent } from './app.component';
import { SupabaseService } from './services/supabase.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('AppComponent', () => {
  let supabaseServiceMock: Partial<SupabaseService>;

  beforeEach(async () => {
    supabaseServiceMock = {
      client: {} as any
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'easy-budgets-frontend' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('easy-budgets-frontend');
  });

  it('should render the navbar shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).not.toBeNull();
  });
});
