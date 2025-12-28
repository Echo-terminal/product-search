# Product Search (Faceted Search)

A high-performance faceted search implementation for a product catalog, powered by Angular 21 and Supabase. This project uses a curated subset of the Open Food Facts database (approx. 10k products).

**Live Demo:** https://simple-product-search.netlify.app/

## Project Goal

The objective was to build a clean, Amazon-like search experience where users can refine results using multiple categories and brands simultaneously.

## Quick Start (Local Run)

The project is pre-configured with a public read-only Supabase instance, so you don't need to set up a database manually.

1. Clone the repository
   ```bash
   git clone https://github.com/Echo-terminal/product-search.git
   cd product-search
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the application
   ```bash
   ng serve
   ```

Navigate to http://localhost:4200/

## Tech Stack

- **Frontend:** Angular 21 + TypeScript
- **Styling:** CSS
- **Database:** PostgreSQL using Supabase platform (Public Read-only access)
- **State Management:** URL-based (Syncing search and filters with query params)

## Key Features

- **Instant Search:** Text search with partial matches using PostgreSQL ILIKE
- **Faceted Navigation:** Multi-select filters for Brands and Categories with dynamic item counts
- **Deep Linking:** All active filters are stored in the URL, making results shareable
- **Optimized Performance:** Heavy lifting (filtering and counting) is handled on the database level via custom PL/pgSQL functions

## Project Structure

- `src/app/core/services`: Logic for interacting with Supabase and handling data
- `src/app/features`: UI components for search, filtering, and product display
- `import-data.js`: The custom script used to scrape and populate the database from Open Food Facts
- `ENGINEERING_NOTES.md`: Detailed breakdown of technical decisions and trade-offs
