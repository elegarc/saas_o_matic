import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CurrencySelectorComponent } from './currency-selector.component';

describe('CurrencySelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencySelectorComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  it('should render currency select field and live status pill', () => {
    const fixture = TestBed.createComponent(CurrencySelectorComponent);
    fixture.componentRef.setInput('selectedCurrency', 'EUR');
    fixture.componentRef.setInput('state', 'live');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.status-label')?.textContent).toContain('En vivo');
    expect(el.querySelector('.select-field')).toBeTruthy();
    expect(el.querySelector('.retry-btn')).toBeNull();
  });

  it('should show retry icon button when state is cached_fallback and emit retryClick', () => {
    const fixture = TestBed.createComponent(CurrencySelectorComponent);
    fixture.componentRef.setInput('selectedCurrency', 'EUR');
    fixture.componentRef.setInput('state', 'cached_fallback');
    fixture.detectChanges();

    let retried = false;
    fixture.componentInstance.retryClick.subscribe(() => {
      retried = true;
    });

    const retryBtn = (fixture.nativeElement as HTMLElement).querySelector(
      '.retry-btn'
    ) as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(retried).toBeTrue();
  });
});

