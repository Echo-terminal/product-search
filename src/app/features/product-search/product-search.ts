import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  private readonly pageSize = 50;
  
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

  private searchSubject = new Subject<string>();

  // Computed
  products = computed(() => this.searchResult().products);
  pagination = computed(() => this.searchResult().pagination);
  hasActiveFilters = computed(() => 
    this.searchQuery().trim() !== '' || this.filters().categories.length > 0
  );

  constructor(
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.updateUrl();
    });

    // Читаем параметры из URL при загрузке
    this.route.queryParams.subscribe(params => {
      // Восстанавливаем поисковый запрос
      const query = params['q'] || '';
      this.searchQuery.set(query);

      // Восстанавливаем категории (декодируем URL-encoded строку)
      const categoriesParam = params['categories'];
      let categories: string[] = [];
      
      if (categoriesParam) {
        try {
          // Декодируем URL-encoded строку
          const decoded = decodeURIComponent(categoriesParam);
          categories = decoded
            .replace(/^\{/, '')
            .replace(/\}$/, '')
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);
        } catch (e) {
          console.error('Error parsing categories:', e);
        }
      }
      
      this.filters.set({ categories });

      // Восстанавливаем страницу
      const page = parseInt(params['page']) || 1;
      this.currentPage.set(page);

      // Выполняем поиск
      this.search();
    });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onFiltersChange(newFilters: FilterState): void {
    this.filters.set(newFilters);
    this.currentPage.set(1);
    this.updateUrl();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.updateUrl();
    this.scrollToTop();
  }

  onClearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.updateUrl();
  }

  private updateUrl(): void {
    const queryParams: any = {};

    if (this.searchQuery().trim()) {
      queryParams['q'] = this.searchQuery().trim();
    }

    if (this.filters().categories.length > 0) {
      const categoriesStr = '{' + this.filters().categories.join(',') + '}';
      queryParams['categories'] = categoriesStr;
    }

    if (this.currentPage() > 1) {
      queryParams['page'] = this.currentPage();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });

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