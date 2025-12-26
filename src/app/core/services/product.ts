import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SupabaseService } from './supabase';

export interface Product {
  id: string;
  name: string;
  brand: string;
  categories: string[];
  countries: string[];
  image_url: string | null;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductSearchResult {
  products: Product[];
  pagination: PaginationInfo;
}

export interface FilterState {
  categories: string[];
  brands: string[];
}

export interface BrandCount {
  brand: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface SearchParams {
  query?: string;
  categories?: string[];
  brands?: string[];
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly DEFAULT_PAGE_SIZE = 20;

  // Inject Supabase service
  constructor(private supabase: SupabaseService) {}

  // Search products with filters and pagination
  searchProducts(params: SearchParams): Observable<ProductSearchResult> {
    const {
      query = '',
      categories = [],
      brands = [],
      page = 1,
      pageSize = this.DEFAULT_PAGE_SIZE
    } = params;

    const offset = (page - 1) * pageSize;
    const to = offset + pageSize - 1;

    let dbQuery = this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .range(offset, to)
      .order('id');

    if (query.trim()) {
      dbQuery = dbQuery.ilike('name', `%${query.trim()}%`);
    }

    if (categories.length > 0) {
      dbQuery = dbQuery.contains('categories', categories);
    }

    if (brands.length > 0) {
      dbQuery = dbQuery.in('brand', brands);
    }

    return from(dbQuery).pipe(
      map(response => {
        if (response.error) throw response.error;

        const totalItems = response.count || 0;
        const totalPages = Math.ceil(totalItems / pageSize);

        return {
          products: (response.data as Product[]) || [],
          pagination: {
            currentPage: page,
            pageSize,
            totalItems,
            totalPages
          }
        };
      }),
      catchError(error => {
        console.error('Search error:', error);
        return of({
          products: [],
          pagination: {
            currentPage: page,
            pageSize,
            totalItems: 0,
            totalPages: 0
          }
        });
      })
    );
  }

  // Fetch number of categories based on current filters
  getCategoriesCount(
    searchQuery?: string,
    brands?: string[]
  ): Observable<number> {
    return from(
      //DB function to get count of distinct categories based on filters
      this.supabase.client.rpc('get_categories_count', {
        search_query: searchQuery || null,
        selected_brands: brands && brands.length > 0 ? brands : null
      })
    ).pipe(
      // Map response to number
      map(response => {
        if (response.error) throw response.error;
        return response.data || 0;
      }),
      catchError(error => {
        console.error('Categories count error:', error);
        return of(0);
      })
    );
  }

  // Fetch paginated categories with counts based on current filters
  getCategoriesPaginated(
    limit: number,
    offset: number,
    searchQuery?: string,
    brands?: string[]
  ): Observable<CategoryCount[]> {
    return from(
      //DB function to get categories with counts based on filters
      this.supabase.client.rpc('get_categories_with_counts', {
        search_query: searchQuery || null,
        selected_brands: brands && brands.length > 0 ? brands : null,
        page_limit: limit,
        page_offset: offset
      })
    ).pipe(
      // Map response to CategoryCount array
      map(response => {
        if (response.error) throw response.error;
        return (response.data as CategoryCount[]) || [];
      }),
      catchError(error => {
        console.error('Categories error:', error);
        return of([]);
      })
    );
  }

  // Similar methods for brands
  getBrandsWithCounts(
    searchQuery?: string,
    categories?: string[],
    limit: number = 50,
    offset: number = 0
  ): Observable<BrandCount[]> {
    return from(
      this.supabase.client.rpc('get_brands_with_counts', {
        search_query: searchQuery || null,
        selected_categories: categories && categories.length > 0 ? categories : null,
        page_limit: limit,
        page_offset: offset
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data as BrandCount[]) || [];
      }),
      catchError(error => {
        console.error('Brands error:', error);
        return of([]);
      })
    );
  }

  getBrandsCount(
    searchQuery?: string,
    categories?: string[]
  ): Observable<number> {
    return from(
      this.supabase.client.rpc('get_brands_count', {
        search_query: searchQuery || null,
        selected_categories: categories && categories.length > 0 ? categories : null
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || 0;
      }),
      catchError(error => {
        console.error('Brands count error:', error);
        return of(0);
      })
    );
  }
}