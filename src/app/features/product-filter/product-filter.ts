import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryCount, BrandCount } from '../../core/services/product';
import { FilterState } from '../product-search/product-search';

@Component({
  selector: 'app-product-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-filter.html',
  styleUrl: './product-filter.css'
})
export class ProductFilterComponent {
  // Inputs
  filters = input.required<FilterState>();
  availableCategories = input.required<CategoryCount[]>();
  availableBrands = input.required<BrandCount[]>();
  totalCategories = input.required<number>();
  totalBrands = input.required<number>();
  loadingCategories = input(false);
  loadingBrands = input(false);
  hasMoreCategories = input(false);
  hasMoreBrands = input(false);

  // Outputs
  filtersChange = output<FilterState>();
  loadMoreCategories = output<void>();
  loadMoreBrands = output<void>();

  // Computed
  hasActiveFilters = computed(() =>
    this.filters().categories.length > 0 || this.filters().brands.length > 0
  );

  // === Categories ===
  
  onCategoryToggle(category: string): void {
    const current = this.filters().categories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];

    this.filtersChange.emit({
      ...this.filters(),
      categories: updated
    });
  }

  isCategorySelected(category: string): boolean {
    return this.filters().categories.includes(category);
  }

  // === Brands ===

  onBrandToggle(brand: string): void {
    const current = this.filters().brands;
    const updated = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];

    this.filtersChange.emit({
      ...this.filters(),
      brands: updated
    });
  }

  isBrandSelected(brand: string): boolean {
    return this.filters().brands.includes(brand);
  }

  // === Actions ===

  onClearFilters(): void {
    this.filtersChange.emit({
      categories: [],
      brands: []
    });
  }

  onLoadMoreCategories(): void {
    this.loadMoreCategories.emit();
  }

  onLoadMoreBrands(): void {
    this.loadMoreBrands.emit();
  }
}