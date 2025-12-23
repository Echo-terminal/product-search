import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../core/services/product';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule],  // Нужны для *ngFor, *ngIf и [(ngModel)]
  templateUrl: './product-search.html',
  styleUrl: './product-search.css'
})
export class ProductSearchComponent implements OnInit {
  products = signal<Product[]>([]);
  searchQuery = signal<string>('');
  loading = signal<boolean>(false);

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    this.productService.searchProducts(this.searchQuery()).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
        console.log('Loaded products:', products);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading.set(false);
      }
    });
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.loadProducts();
  }
}