import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductFilterComponent } from '../product-filter/product-filter';
import { ProductListComponent } from '../product-list/product-list';
import { ProductService, ProductSearchResult } from '../../core/services/product';

export interface FilterState {
  categories: string[];
}

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFilterComponent, ProductListComponent],
  templateUrl: './product-search.html',
  styleUrl: './product-search.css'
})
export class ProductSearchComponent implements OnInit {
  private readonly pageSize = 24;
  
  // State
  searchQuery = signal('');
  filters = signal<FilterState>({
    categories: []
  });
  
  currentPage = signal(1);
  searchResult = signal<ProductSearchResult>({
    products: [],
    pagination: {
      currentPage: 1,
      pageSize: this.pageSize,
      totalItems: 0,
      totalPages: 0
    }
  });
  
  loading = signal(false);

  // Computed
  products = computed(() => this.searchResult().products);
  pagination = computed(() => this.searchResult().pagination);
  hasActiveFilters = computed(() => 
    this.searchQuery().trim() !== '' || this.filters().categories.length > 0
  );

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.search();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1); // Сброс на первую страницу
    this.search();
  }

  onFiltersChange(newFilters: FilterState): void {
    this.filters.set(newFilters);
    this.currentPage.set(1); // Сброс на первую страницу
    this.search();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.search();
    this.scrollToTop();
  }

  onClearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.search();
  }

  private search(): void {
    this.loading.set(true);
    
    this.productService.searchProducts({
      query: this.searchQuery(),
      categories: this.filters().categories,
      page: this.currentPage(),
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.searchResult.set(result);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Search failed:', error);
        this.loading.set(false);
      }
    });
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}