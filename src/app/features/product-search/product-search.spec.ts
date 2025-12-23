import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductSearch } from './product-search';

describe('ProductSearch', () => {
  let component: ProductSearch;
  let fixture: ComponentFixture<ProductSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
