export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "updatedAt">;

export interface InventorySummary {
  productCount: number;
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
}
