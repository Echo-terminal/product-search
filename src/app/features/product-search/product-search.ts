import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ProductFilterComponent } from '../product-filter/product-filter';
import { ProductListComponent } from '../product-list/product-list';
import { ProductService, ProductSearchResult, CategoryCount, BrandCount } from '../../core/services/product';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { NgIcon, provideIcons } from '@ng-icons/core';


export interface FilterState {
  categories: string[];
  brands: string[];
}

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFilterComponent, ProductListComponent, NgIcon],
  viewProviders: [provideIcons({  heroXMark })],
  templateUrl: './product-search.html',
  styleUrl: './product-search.css'
})
export class ProductSearchComponent implements OnInit {
    private readonly pageSize = 50;
    private readonly CATEGORIES_PER_PAGE = 50;
  
  searchQuery = signal('');
  filters = signal<FilterState>({
    categories: [],
    brands: []
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
  
  // State для категорий
  availableCategories = signal<CategoryCount[]>([]);
  totalCategories = signal(0);
  currentCategoriesOffset = signal(0);
  loadingCategories = signal(false);
  
  // State для брендов
  availableBrands = signal<BrandCount[]>([]);
  totalBrands = signal(0);
  loadingBrands = signal(false);
  
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  // Computed
  products = computed(() => this.searchResult().products);
  pagination = computed(() => this.searchResult().pagination);
  hasActiveFilters = computed(() => 
    this.searchQuery().trim() !== '' || 
    this.filters().categories.length > 0 || 
    this.filters().brands.length > 0
  );
  
  hasMoreCategories = computed(() => 
    this.availableCategories().length < this.totalCategories()
  );

  constructor(
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Effect для перезагрузки фильтров при изменении выбора
    effect(() => {
      const query = this.searchQuery();
      const categories = this.filters().categories;
      const brands = this.filters().brands;
      
      // Перезагружаем динамические фильтры
      this.reloadFilters();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const searchSub = this.searchSubject.pipe(
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.updateUrl();
    });
    this.subscriptions.add(searchSub);

    // Читаем параметры из URL
    const paramsSub = this.route.queryParams.subscribe(params => {
      let shouldSearch = false;

      // Поисковый запрос
      const query = params['q'] || '';
      if (this.searchQuery() !== query) {
        this.searchQuery.set(query);
        shouldSearch = true;
      }

      // Категории
      const categoriesParam = params['categories'];
      let categories: string[] = [];
      if (categoriesParam) {
        try {
          const decoded = decodeURIComponent(categoriesParam);
          categories = decoded
            .replace(/^\{/, '').replace(/\}$/, '')
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);
        } catch (e) {
          console.error('Error parsing categories:', e);
        }
      }

      // Бренды
      const brandsParam = params['brands'];
      let brands: string[] = [];
      if (brandsParam) {
        try {
          const decoded = decodeURIComponent(brandsParam);
          brands = decoded
            .replace(/^\{/, '').replace(/\}$/, '')
            .split(',')
            .map(b => b.trim())
            .filter(b => b.length > 0);
        } catch (e) {
          console.error('Error parsing brands:', e);
        }
      }

      const currentFilters = this.filters();
      if (JSON.stringify(categories.sort()) !== JSON.stringify(currentFilters.categories.sort()) ||
          JSON.stringify(brands.sort()) !== JSON.stringify(currentFilters.brands.sort())) {
        this.filters.set({ categories, brands });
        shouldSearch = true;
      }

      // Страница
      const page = parseInt(params['page']) || 1;
      if (this.currentPage() !== page) {
        this.currentPage.set(page);
        shouldSearch = true;
      }

      if (shouldSearch) {
        this.search();
      }
    });
    this.subscriptions.add(paramsSub);
    
    // Загружаем начальные фильтры
    this.loadCategories();
    this.loadBrands();
    this.search();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
  
  onLoadMoreCategories(): void {
    const newOffset = this.currentCategoriesOffset() + this.CATEGORIES_PER_PAGE;
    this.currentCategoriesOffset.set(newOffset);
    this.loadCategories(true); // append mode
  }

  private updateUrl(): void {
    const queryParams: any = {};

    if (this.searchQuery().trim()) {
      queryParams['q'] = this.searchQuery().trim();
    }

    if (this.filters().categories.length > 0) {
      queryParams['categories'] = '{' + this.filters().categories.join(',') + '}';
    }

    if (this.filters().brands.length > 0) {
      queryParams['brands'] = '{' + this.filters().brands.join(',') + '}';
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
      brands: this.filters().brands,
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
  
  private reloadFilters(): void {
    // Сбрасываем и перезагружаем
    this.currentCategoriesOffset.set(0);
    this.loadCategories(false);
    this.loadBrands();
  }

  private loadCategories(append: boolean = false): void {
    this.loadingCategories.set(true);
    
    const selectedBrands = this.filters().brands;
    
    this.productService.getCategoriesPaginated(
      this.CATEGORIES_PER_PAGE,
      this.currentCategoriesOffset(),
      this.searchQuery() || undefined,
      selectedBrands.length > 0 ? selectedBrands : undefined
    ).subscribe({
      next: (categories) => {
        if (append) {
          const current = this.availableCategories();
          this.availableCategories.set([...current, ...categories]);
        } else {
          this.availableCategories.set(categories);
        }
        this.loadingCategories.set(false);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.loadingCategories.set(false);
      }
    });

    this.productService.getCategoriesCount(
      this.searchQuery() || undefined,
      selectedBrands.length > 0 ? selectedBrands : undefined
    ).subscribe({
      next: (count) => this.totalCategories.set(count)
    });
  }

  private loadBrands(): void {
    this.loadingBrands.set(true);
    
    const selectedCategories = this.filters().categories;
    
    this.productService.getBrandsWithCounts(
      this.searchQuery() || undefined,
      selectedCategories.length > 0 ? selectedCategories : undefined
    ).subscribe({
      next: (brands) => {
        this.availableBrands.set(brands);
        this.loadingBrands.set(false);
      },
      error: (error) => {
        console.error('Failed to load brands:', error);
        this.loadingBrands.set(false);
      }
    });

    this.productService.getBrandsCount(
      this.searchQuery() || undefined,
      selectedCategories.length > 0 ? selectedCategories : undefined
    ).subscribe({
      next: (count) => this.totalBrands.set(count)
    });
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}