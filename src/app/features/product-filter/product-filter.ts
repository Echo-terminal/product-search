import { Component, OnInit, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, CategoryCount } from '../../core/services/product';
import { FilterState } from '../product-search/product-search';

@Component({
  selector: 'app-product-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-filter.html',
  styleUrl: './product-filter.css'
})
export class ProductFilterComponent implements OnInit {
  private readonly CATEGORIES_PER_PAGE = 50;

  // Inputs/Outputs
  filters = input.required<FilterState>();
  filtersChange = output<FilterState>();

  // State
  selectedCategories = signal<string[]>([]);
  displayedCategories = signal<CategoryCount[]>([]);
  totalCategories = signal(0);
  currentOffset = signal(0);
  loadingCategories = signal(false);

  // Computed
  hasActiveFilters = computed(() => this.selectedCategories().length > 0);
  hasMoreCategories = computed(() => 
    this.displayedCategories().length < this.totalCategories()
  );
  displayedCount = computed(() => this.displayedCategories().length);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.selectedCategories.set([...this.filters().categories]);
    this.loadTotalCategoriesCount();
    this.loadCategories();
  }

  onCategoryToggle(category: string): void {
    const current = this.selectedCategories();
    const index = current.indexOf(category);
    
    const updated = index > -1
      ? current.filter(c => c !== category)
      : [...current, category];
    
    this.selectedCategories.set(updated);
    this.emitFilters();
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories().includes(category);
  }

  onLoadMore(): void {
    const newOffset = this.currentOffset() + this.CATEGORIES_PER_PAGE;
    this.currentOffset.set(newOffset);
    this.loadCategories();
  }

  onClearFilters(): void {
    this.selectedCategories.set([]);
    this.emitFilters();
  }

  private loadTotalCategoriesCount(): void {
    this.productService.getCategoriesCount().subscribe({
      next: (count) => this.totalCategories.set(count),
      error: (error) => console.error('Failed to load categories count:', error)
    });
  }

  private loadCategories(): void {
    this.loadingCategories.set(true);
    
    this.productService.getCategoriesPaginated(
      this.CATEGORIES_PER_PAGE,
      this.currentOffset()
    ).subscribe({
      next: (categories) => {
        const current = this.displayedCategories();
        this.displayedCategories.set([...current, ...categories]);
        this.loadingCategories.set(false);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.loadingCategories.set(false);
      }
    });
  }

  private emitFilters(): void {
    this.filtersChange.emit({
      categories: this.selectedCategories()
    });
  }
}