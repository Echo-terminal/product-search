import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { ProductFilterComponent } from '../product-filter/product-filter';
import { ProductListComponent } from '../product-list/product-list';
import { ProductService, ProductSearchResult, CategoryCount, BrandCount } from '../../core/services/product';
import { heroXMark,heroChevronLeft,heroChevronRight } from '@ng-icons/heroicons/outline';
import { NgIcon, provideIcons } from '@ng-icons/core';

export interface FilterState {
  categories: string[];
  brands: string[];
}

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFilterComponent, ProductListComponent, NgIcon],
  viewProviders: [provideIcons({ heroXMark, heroChevronLeft, heroChevronRight })],
  templateUrl: './product-search.html',
  styleUrl: './product-search.css'
})
export class ProductSearchComponent implements OnInit {
  private readonly PAGE_SIZE = 50;
  private readonly FILTERS_LOAD_SIZE = 50;

  isFilterPanelOpen = false;

  ToggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  // State
  searchQuery = signal('');
  filters = signal<FilterState>({
    categories: [],
    brands: []
  });
  currentPage = signal(1);

  // Products
  searchResult = signal<ProductSearchResult>({
    products: [],
    pagination: {
      currentPage: 1,
      pageSize: this.PAGE_SIZE,
      totalItems: 0,
      totalPages: 0
    }
  });
  loading = signal(false);

  // Filters state
  availableCategories = signal<CategoryCount[]>([]);
  totalCategories = signal(0);
  loadingCategories = signal(false);

  availableBrands = signal<BrandCount[]>([]);
  totalBrands = signal(0);
  loadingBrands = signal(false);

  private searchSubject = new Subject<string>();
  private subscription = new Subscription();

  // Computed
  products = computed(() => this.searchResult().products);
  pagination = computed(() => this.searchResult().pagination);
  activeFiltersCount = computed(() => 
    this.filters().categories.length + this.filters().brands.length
  );
  
  hasMoreCategories = computed(() => 
    this.availableCategories().length < this.totalCategories()
  );
  
  hasMoreBrands = computed(() => 
    this.availableBrands().length < this.totalBrands()
  );

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Debounce for search
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.performSearch();
    });
    this.subscription.add(searchSub);

    this.readFromUrl();
    
    // load initial data
    this.loadCategories();
    this.loadBrands();
    this.performSearch();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // === Handlers ===

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onFiltersChange(newFilters: FilterState): void {
    const oldFilters = this.filters();
    this.filters.set(newFilters);
    
    // Check what changed
    const categoriesChanged = JSON.stringify(oldFilters.categories) !== JSON.stringify(newFilters.categories);
    const brandsChanged = JSON.stringify(oldFilters.brands) !== JSON.stringify(newFilters.brands);
    
    if (categoriesChanged) {
      this.loadBrands(true); // reset
    }
    
    if (brandsChanged) {
      this.loadCategories(true); // reset
    }
    
    this.currentPage.set(1);
    this.performSearch();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.performSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onClearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.performSearch();
  }

  onLoadMoreCategories(): void {
    this.loadCategories(false); // append
  }

  onLoadMoreBrands(): void {
    this.loadBrands(false); // append
  }

  // === Data Loading ===

  private performSearch(): void {
    this.loading.set(true);
    this.updateUrl();

    this.productService.searchProducts({
      query: this.searchQuery(),
      categories: this.filters().categories,
      brands: this.filters().brands,
      page: this.currentPage(),
      pageSize: this.PAGE_SIZE
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

  private loadCategories(reset: boolean = false): void {
    this.loadingCategories.set(true);

    const currentCount = reset ? 0 : this.availableCategories().length;
    const selectedBrands = this.filters().brands;

    this.productService.getCategoriesPaginated(
      this.FILTERS_LOAD_SIZE,
      currentCount, // offset = how many already loaded
      this.searchQuery() || undefined,
      selectedBrands.length > 0 ? selectedBrands : undefined
    ).subscribe({
      next: (categories) => {
        if (reset) {
          this.availableCategories.set(categories);
        } else {
          this.availableCategories.set([
            ...this.availableCategories(),
            ...categories
          ]);
        }
        this.loadingCategories.set(false);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.loadingCategories.set(false);
      }
    });

    // Get total count of categories
    this.productService.getCategoriesCount(
      this.searchQuery() || undefined,
      selectedBrands.length > 0 ? selectedBrands : undefined
    ).subscribe({
      next: (count) => this.totalCategories.set(count),
      error: (error) => console.error('Failed to load categories count:', error)
    });
  }

  private loadBrands(reset: boolean = false): void {
    this.loadingBrands.set(true);

    const currentCount = reset ? 0 : this.availableBrands().length;
    const selectedCategories = this.filters().categories;

    this.productService.getBrandsWithCounts(
      this.searchQuery() || undefined,
      selectedCategories.length > 0 ? selectedCategories : undefined,
      this.FILTERS_LOAD_SIZE,
      currentCount // offset same as above
    ).subscribe({
      next: (brands) => {
        if (reset) {
          this.availableBrands.set(brands);
        } else {
          this.availableBrands.set([
            ...this.availableBrands(),
            ...brands
          ]);
        }
        this.loadingBrands.set(false);
      },
      error: (error) => {
        console.error('Failed to load brands:', error);
        this.loadingBrands.set(false);
      }
    });

    // Get total count but this time of brands
    this.productService.getBrandsCount(
      this.searchQuery() || undefined,
      selectedCategories.length > 0 ? selectedCategories : undefined
    ).subscribe({
      next: (count) => this.totalBrands.set(count),
      error: (error) => console.error('Failed to load brands count:', error)
    });
  }

  // === URL State ===

  private updateUrl(): void {
    const params = new URLSearchParams();

    if (this.searchQuery().trim()) {
      params.set('q', this.searchQuery().trim());
    }

    if (this.filters().categories.length > 0) {
      params.set('categories', this.filters().categories.join(','));
    }

    if (this.filters().brands.length > 0) {
      params.set('brands', this.filters().brands.join(','));
    }

    if (this.currentPage() > 1) {
      params.set('page', this.currentPage().toString());
    }

    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }

  private readFromUrl(): void {
    const params = new URLSearchParams(window.location.search);

    const query = params.get('q') || '';
    if (query) {
      this.searchQuery.set(query);
    }

    const categoriesParam = params.get('categories');
    const categories = categoriesParam
      ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const brandsParam = params.get('brands');
    const brands = brandsParam
      ? brandsParam.split(',').map(b => b.trim()).filter(Boolean)
      : [];

    if (categories.length > 0 || brands.length > 0) {
      this.filters.set({ categories, brands });
    }

    const page = parseInt(params.get('page') || '1');
    if (page > 1) {
      this.currentPage.set(page);
    }
  }
}