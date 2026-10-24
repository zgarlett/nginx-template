import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Product, ProductInput } from "@inventory/shared";

const dataDirectory = process.env.DATA_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
const dataFile = path.join(dataDirectory, "products.json");

const examples: Product[] = [
  { id: "p-1001", sku: "WH-1001", name: "Wireless headphones", category: "Electronics", quantity: 24, reorderLevel: 10, unitPrice: 79.99, updatedAt: new Date().toISOString() },
  { id: "p-1002", sku: "OF-2048", name: "Desk organizer", category: "Office", quantity: 8, reorderLevel: 12, unitPrice: 18.5, updatedAt: new Date().toISOString() },
  { id: "p-1003", sku: "KT-0312", name: "Ceramic mug", category: "Kitchen", quantity: 46, reorderLevel: 15, unitPrice: 12, updatedAt: new Date().toISOString() },
  { id: "p-1004", sku: "EL-0091", name: "USB-C cable", category: "Electronics", quantity: 5, reorderLevel: 20, unitPrice: 9.99, updatedAt: new Date().toISOString() },
  { id: "p-1005", sku: "OF-1077", name: "Hardcover notebook", category: "Office", quantity: 32, reorderLevel: 10, unitPrice: 7.25, updatedAt: new Date().toISOString() },
  { id: "p-1006", sku: "HM-4402", name: "Linen throw blanket", category: "Home", quantity: 0, reorderLevel: 6, unitPrice: 54, updatedAt: new Date().toISOString() }
];

let products: Product[] = [];
let mutationQueue = Promise.resolve();

async function persist(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

export async function initializeStore(): Promise<void> {
  try {
    products = JSON.parse(await readFile(dataFile, "utf8")) as Product[];
    if (!Array.isArray(products)) throw new Error("Inventory data must be an array.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    products = examples;
    await persist();
  }
}

function mutate<T>(change: () => T): Promise<T> {
  let result: T;
  const operation = mutationQueue.then(async () => {
    result = change();
    await persist();
    return result;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function listProducts(): Product[] {
  return [...products];
}

export function addProduct(input: ProductInput): Promise<Product> {
  return mutate(() => {
    if (products.some((product) => product.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new Error("A product with this SKU already exists.");
    }
    const product: Product = { ...input, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    products.unshift(product);
    return product;
  });
}

export function updateProduct(id: string, input: ProductInput): Promise<Product | undefined> {
  return mutate(() => {
    const index = products.findIndex((product) => product.id === id);
    if (index < 0) return undefined;
    if (products.some((product) => product.id !== id && product.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new Error("A product with this SKU already exists.");
    }
    const product = { ...input, id, updatedAt: new Date().toISOString() };
    products[index] = product;
    return product;
  });
}

export function adjustStock(id: string, adjustment: number): Promise<Product | undefined> {
  return mutate(() => {
    const product = products.find((item) => item.id === id);
    if (!product) return undefined;
    if (product.quantity + adjustment < 0) throw new Error("Stock cannot be reduced below zero.");
    product.quantity += adjustment;
    product.updatedAt = new Date().toISOString();
    return product;
  });
}

export function removeProduct(id: string): Promise<boolean> {
  return mutate(() => {
    const remaining = products.filter((product) => product.id !== id);
    if (remaining.length === products.length) return false;
    products = remaining;
    return true;
  });
}
