import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, PaginationInfo } from '../../core/services/product';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductListComponent {
  // Inputs
  products = input.required<Product[]>();
  pagination = input.required<PaginationInfo>();
  loading = input(false);
  searchQuery = input('');

  // Outputs
  pageChange = output<number>();

  // Computed
  hasProducts = computed(() => this.products().length > 0);
  hasMultiplePages = computed(() => this.pagination().totalPages > 1);
  isFirstPage = computed(() => this.pagination().currentPage === 1);
  isLastPage = computed(() => 
    this.pagination().currentPage === this.pagination().totalPages
  );

  // Методы для пагинации
  onPrevious(): void {
    if (!this.isFirstPage()) {
      this.pageChange.emit(this.pagination().currentPage - 1);
    }
  }

  onNext(): void {
    if (!this.isLastPage()) {
      this.pageChange.emit(this.pagination().currentPage + 1);
    }
  }

  onGoToPage(page: number): void {
    this.pageChange.emit(page);
  }

  getPaginationPages(): (number | string)[] {
    const current = this.pagination().currentPage;
    const total = this.pagination().totalPages;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Показываем все страницы
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Умная пагинация
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }
}