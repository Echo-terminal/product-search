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
  // Inputs - все данные от родителя
  filters = input.required<FilterState>();
  availableCategories = input.required<CategoryCount[]>();
  availableBrands = input.required<BrandCount[]>();
  totalCategories = input.required<number>();
  totalBrands = input.required<number>();
  loadingCategories = input(false);
  loadingBrands = input(false);
  hasMoreCategories = input(false);

  // Outputs - только события
  filtersChange = output<FilterState>();
  loadMoreCategories = output<void>();

  // Computed - читаем из родителя
  selectedCategories = computed(() => this.filters().categories);
  selectedBrands = computed(() => this.filters().brands);
  hasActiveFilters = computed(() => 
    this.selectedCategories().length > 0 || this.selectedBrands().length > 0
  );

  // Категории
  onCategoryToggle(category: string): void {
    const current = this.selectedCategories();
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    
    this.filtersChange.emit({
      ...this.filters(),
      categories: updated
    });
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories().includes(category);
  }

  onLoadMoreCategories(): void {
    this.loadMoreCategories.emit();
  }

  // Бренды
  onBrandToggle(brand: string): void {
    const current = this.selectedBrands();
    const updated = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    
    this.filtersChange.emit({
      ...this.filters(),
      brands: updated
    });
  }

  isBrandSelected(brand: string): boolean {
    return this.selectedBrands().includes(brand);
  }

  onClearFilters(): void {
    this.filtersChange.emit({
      categories: [],
      brands: []
    });
  }
}