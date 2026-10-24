# Stockroom

A small inventory management app with a React dashboard, an Express API, and a shared TypeScript product model.

## Run locally

Requirements: Node.js 22+ and npm.

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (by default `http://localhost:5173`). The API runs on port `3000`; Vite proxies `/api` requests to it. The first run seeds example products in `backend/data/products.json`.

To create a production build:

```sh
npm run build
npm start
```

## Run with Docker

```sh
docker compose up --build
```

Open `http://localhost:8080`. The API is routed through Nginx, and inventory JSON is stored in the persistent `inventory-data` volume.

## Features

- Inventory dashboard with product counts, units, stock value, and low-stock alerts.
- Search by name, SKU, or category, plus category and low-stock filters.
- Add, edit, delete, and adjust product stock.
- Input validation, duplicate-SKU protection, and stock adjustments that cannot take inventory below zero.
- JSON-file persistence configurable with the backend `DATA_DIR` environment variable.

## API

- `GET /api/health`
- `GET /api/products?search=...&category=...`
- `GET /api/summary`
- `POST /api/products`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/stock` with `{ "adjustment": 5 }`
- `DELETE /api/products/:id`
# nginx-template
