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

export interface CategoryCount {
  category: string;
  count: number;
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

export interface SearchParams {
  query?: string;
  categories?: string[];
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly DEFAULT_PAGE_SIZE = 20;

  constructor(private supabase: SupabaseService) {}

  searchProducts(params: SearchParams): Observable<ProductSearchResult> {
    const {
      query = '',
      categories = [],
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

    // Текстовый поиск
    if (query.trim()) {
      dbQuery = dbQuery.ilike('name', `%${query.trim()}%`);
    }

    // Фильтр по категориям
    if (categories.length > 0) {
      dbQuery = dbQuery.contains('categories', categories);
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

  getCategoriesCount(): Observable<number> {
    return from(
      this.supabase.client.rpc('get_categories_count')
    ).pipe(
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

  getCategoriesPaginated(limit: number, offset: number): Observable<CategoryCount[]> {
    return from(
      this.supabase.client.rpc('get_categories_with_counts', {
        page_limit: limit,
        page_offset: offset
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data as CategoryCount[]) || [];
      }),
      catchError(error => {
        console.error('Categories pagination error:', error);
        return of([]);
      })
    );
  }
}