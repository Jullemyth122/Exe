import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand title as PawShop', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const logoTitle = compiled.querySelector('.logo-title');
    expect(logoTitle?.textContent).toContain('PawShop');
  });

  it('should default to dark theme and toggle theme state', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    // Default theme should be dark
    expect(app.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Toggle theme to light
    app.toggleTheme();
    fixture.detectChanges();
    expect(app.isDark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Toggle back to dark
    app.toggleTheme();
    fixture.detectChanges();
    expect(app.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
