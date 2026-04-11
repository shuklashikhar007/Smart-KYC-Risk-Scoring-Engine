import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportPanel } from './import-panel';

describe('ImportPanel', () => {
  let component: ImportPanel;
  let fixture: ComponentFixture<ImportPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
