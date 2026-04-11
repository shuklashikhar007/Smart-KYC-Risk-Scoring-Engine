import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KycTable } from './kyc-table';

describe('KycTable', () => {
  let component: KycTable;
  let fixture: ComponentFixture<KycTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KycTable],
    }).compileComponents();

    fixture = TestBed.createComponent(KycTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
