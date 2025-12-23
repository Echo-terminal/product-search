import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProductSearchComponent } from './features/product-search/product-search';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ProductSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('product-search');
}
