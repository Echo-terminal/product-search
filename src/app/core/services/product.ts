import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase';

export interface Product {
  id: string;
  name: string;
  brand: string;
  categories: string[];
  countries: string[];
  image_url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private supabase: SupabaseService) {}

  // Простой поиск - для начала
  searchProducts(searchQuery: string = ''): Observable<Product[]> {
    let query = this.supabase.client
      .from('products')
      .select('*')
      .limit(20);

    // Если есть поисковый запрос
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) {
          console.error('Error:', response.error);
          return [];
        }
        return response.data as Product[];
      })
    );
  }
}