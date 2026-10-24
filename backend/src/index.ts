import express from "express";
import type { InventorySummary, ProductInput } from "@inventory/shared";
import { addProduct, adjustStock, initializeStore, listProducts, removeProduct, updateProduct } from "./store.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

function parseProductInput(body: unknown): ProductInput | undefined {
  if (!body || typeof body !== "object") return undefined;
  const input = body as Record<string, unknown>;
  const { sku, name, category, quantity, reorderLevel, unitPrice } = input;
  if (
    typeof sku !== "string" || !sku.trim() || sku.trim().length > 40 ||
    typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
    typeof category !== "string" || !category.trim() || category.trim().length > 60 ||
    !Number.isSafeInteger(quantity) || (quantity as number) < 0 ||
    !Number.isSafeInteger(reorderLevel) || (reorderLevel as number) < 0 ||
    typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0
  ) return undefined;
  return {
    sku: sku.trim(),
    name: name.trim(),
    category: category.trim(),
    quantity: quantity as number,
    reorderLevel: reorderLevel as number,
    unitPrice
  };
}

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.get("/api/products", (request, response) => {
  const query = String(request.query.search ?? "").trim().toLowerCase();
  const category = String(request.query.category ?? "").trim().toLowerCase();
  const result = listProducts().filter((product) => {
    const matchesQuery = !query || [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (!category || product.category.toLowerCase() === category);
  });
  response.json(result);
});

app.get("/api/summary", (_request, response) => {
  const products = listProducts();
  const summary: InventorySummary = {
    productCount: products.length,
    totalUnits: products.reduce((sum, product) => sum + product.quantity, 0),
    inventoryValue: Math.round(products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0) * 100) / 100,
    lowStockCount: products.filter((product) => product.quantity <= product.reorderLevel).length
  };
  response.json(summary);
});

app.post("/api/products", async (request, response, next) => {
  const input = parseProductInput(request.body);
  if (!input) {
    response.status(400).json({ error: "Provide a SKU, name, category, non-negative whole-number stock and reorder level, and a non-negative price." });
    return;
  }
  try {
    response.status(201).json(await addProduct(input));
  } catch (error) {
    if (error instanceof Error && error.message.includes("SKU")) {
      response.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.put("/api/products/:id", async (request, response, next) => {
  const input = parseProductInput(request.body);
  if (!input) {
    response.status(400).json({ error: "Provide a SKU, name, category, non-negative whole-number stock and reorder level, and a non-negative price." });
    return;
  }
  try {
    const product = await updateProduct(request.params.id, input);
    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    response.json(product);
  } catch (error) {
    if (error instanceof Error && error.message.includes("SKU")) {
      response.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/products/:id/stock", async (request, response, next) => {
  const adjustment = request.body?.adjustment;
  if (!Number.isSafeInteger(adjustment) || adjustment === 0) {
    response.status(400).json({ error: "Adjustment must be a non-zero whole number." });
    return;
  }
  try {
    const product = await adjustStock(request.params.id, adjustment as number);
    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    response.json(product);
  } catch (error) {
    if (error instanceof Error && error.message.includes("below zero")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.delete("/api/products/:id", async (request, response, next) => {
  try {
    const removed = await removeProduct(request.params.id);
    if (!removed) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Request failed:", error);
  response.status(500).json({ error: "The request could not be completed." });
});

await initializeStore();
app.listen(port, () => console.log(`Inventory API listening on port ${port}`));
