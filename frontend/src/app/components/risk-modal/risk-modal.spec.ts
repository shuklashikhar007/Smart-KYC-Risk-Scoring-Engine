import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskModal } from './risk-modal';

describe('RiskModal', () => {
  let component: RiskModal;
  let fixture: ComponentFixture<RiskModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskModal],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
