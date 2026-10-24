import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, Box, ChevronDown, CircleHelp, Command, LayoutDashboard,
  MoreHorizontal, PackagePlus, Plus, Search, Settings2, SlidersHorizontal, Sparkles, X
} from "lucide-react";
import type { InventorySummary, Product, ProductInput } from "@inventory/shared";

const emptyForm: ProductInput = { sku: "", name: "", category: "Electronics", quantity: 0, reorderLevel: 10, unitPrice: 0 };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({ error: "Something went wrong." }));
    throw new Error(result.error ?? "Something went wrong.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function isLow(product: Product): boolean {
  return product.quantity <= product.reorderLevel;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({ productCount: 0, totalUnits: 0, inventoryValue: 0, lowStockCount: 0 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [dialog, setDialog] = useState<"add" | "edit" | "adjust" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [adjustment, setAdjustment] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const [nextProducts, nextSummary] = await Promise.all([
      request<Product[]>("/api/products"),
      request<InventorySummary>("/api/summary")
    ]);
    setProducts(nextProducts);
    setSummary(nextSummary);
  }, []);

  useEffect(() => {
    refresh().catch((issue: Error) => setError(issue.message)).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "All categories" || (category === "Low stock" ? isLow(product) : product.category === category);
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [product.name, product.sku, product.category].some((field) => field.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  }), [products, category, search]);
  const lowStock = products.filter(isLow);

  function openDialog(kind: "add" | "edit" | "adjust", product?: Product) {
    setError("");
    setSelected(product ?? null);
    setForm(product ? {
      sku: product.sku, name: product.name, category: product.category,
      quantity: product.quantity, reorderLevel: product.reorderLevel, unitPrice: product.unitPrice
    } : emptyForm);
    setAdjustment(1);
    setDialog(kind);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await request<Product>(dialog === "edit" && selected ? `/api/products/${selected.id}` : "/api/products", {
        method: dialog === "edit" ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      await refresh();
      setDialog(null);
      setNotice(dialog === "edit" ? "Product updated" : "Product added to your inventory");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to save product.");
    }
  }

  async function saveAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError("");
    try {
      await request<Product>(`/api/products/${selected.id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ adjustment })
      });
      await refresh();
      setDialog(null);
      setNotice("Stock level updated");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update stock.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from your inventory?`)) return;
    try {
      await request<void>(`/api/products/${product.id}`, { method: "DELETE" });
      await refresh();
      setNotice("Product removed");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to remove product.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Stockroom home">
          <span className="brand-mark"><Box size={19} strokeWidth={2.4} /></span>
          <span>stockroom<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switch">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><strong>Northstar Goods</strong><span>Workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav className="main-nav">
          <a className="nav-item active" href="#inventory"><LayoutDashboard size={17} /> Overview</a>
          <a className="nav-item" href="#inventory"><Box size={17} /> Inventory <span className="nav-count">{summary.productCount}</span></a>
          <a className="nav-item" href="#alerts"><AlertTriangle size={17} /> Low stock {summary.lowStockCount > 0 && <span className="nav-alert">{summary.lowStockCount}</span>}</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Sparkles size={15} /></span>
            <strong>Keep things moving</strong>
            <p>Stay ahead of low stock before it slows you down.</p>
            <a href="#alerts">Review alerts <ArrowUp size={13} /></a>
          </div>
          <a className="nav-item muted" href="#settings"><Settings2 size={17} /> Settings</a>
          <div className="profile">
            <div className="profile-avatar">JD</div>
            <div className="profile-copy"><strong>Jordan Davis</strong><span>Admin</span></div>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      <main className="main-content" id="inventory">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <div className="search-wrap top-search"><Search size={15} /><input aria-label="Search inventory" placeholder="Search anything..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd><Command size={10} /> K</kbd></div>
            <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>
            <div className="top-avatar">JD</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> INVENTORY OVERVIEW</div>
              <h1>Your stockroom, <span>at a glance.</span></h1>
              <p className="page-subtitle">Here’s what’s happening with your inventory today.</p>
            </div>
            <button className="primary-button" onClick={() => openDialog("add")}><Plus size={17} /> Add product</button>
          </div>

          {error && !dialog && <div className="banner-error"><AlertTriangle size={16} />{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></div>}

          <section className="stats-grid" aria-label="Inventory summary">
            <article className="stat-card">
              <div className="stat-top"><span>Total products</span><span className="stat-icon sage"><Box size={17} /></span></div>
              <div className="stat-value">{loading ? "—" : summary.productCount.toLocaleString()}</div>
              <div className="stat-note"><span className="trend"><ArrowUp size={13} /> Live</span><span>across your catalog</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Units in stock</span><span className="stat-icon blue"><PackagePlus size={17} /></span></div>
              <div className="stat-value">{loading ? "—" : summary.totalUnits.toLocaleString()}</div>
              <div className="stat-note"><span className="note-dot blue-dot" /> Ready to ship</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Inventory value</span><span className="stat-icon violet"><SlidersHorizontal size={17} /></span></div>
              <div className="stat-value">{loading ? "—" : money.format(summary.inventoryValue)}</div>
              <div className="stat-note"><span className="note-dot violet-dot" /> At current unit cost</div>
            </article>
            <article className={`stat-card ${summary.lowStockCount > 0 ? "stat-warning" : ""}`}>
              <div className="stat-top"><span>Need attention</span><span className="stat-icon amber"><AlertTriangle size={17} /></span></div>
              <div className="stat-value">{loading ? "—" : summary.lowStockCount}</div>
              <div className="stat-note">{summary.lowStockCount > 0 ? <><span className="warning-label">Low stock</span><span>below reorder point</span></> : <><span className="trend">All clear</span><span>stock levels look good</span></>}</div>
            </article>
          </section>

          <section className="inventory-section">
            <div className="section-heading">
              <div><div className="section-title-line"><h2>All products</h2><span className="product-count">{filteredProducts.length}</span></div><p>Manage and keep track of your inventory.</p></div>
              <label className="category-filter"><SlidersHorizontal size={14} /><select aria-label="Filter by category" value={category === "Low stock" ? "All categories" : category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
            </div>
            <div className="table-toolbar">
              <div className="tabs">
                <button className={`tab ${category === "All categories" ? "selected" : ""}`} onClick={() => setCategory("All categories")}>All products <span>{products.length}</span></button>
                <button className={`tab ${category === "Low stock" ? "selected" : ""}`} onClick={() => setCategory(category === "Low stock" ? "All categories" : "Low stock")}>Low stock <span className={summary.lowStockCount ? "tab-alert" : ""}>{summary.lowStockCount}</span></button>
              </div>
              <div className="toolbar-search"><Search size={15} /><input aria-label="Search products" placeholder="Search products..." value={search} onChange={(event) => setSearch(event.target.value)} /><button aria-label="Clear search" onClick={() => setSearch("")}><X size={13} /></button></div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th><span className="check-box" /></th><th>PRODUCT <ArrowDown size={12} /></th><th>SKU</th><th>CATEGORY</th><th>STOCK LEVEL</th><th>UNIT PRICE</th><th>STATUS</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} className="empty-row">Loading your inventory...</td></tr> :
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td><span className="check-box" /></td>
                        <td><div className="product-cell"><span className={`product-art art-${product.category.toLowerCase().replace(/[^a-z]/g, "")}`}><Box size={17} /></span><div><strong>{product.name}</strong><span>Updated {new Date(product.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div></div></td>
                        <td><span className="sku">{product.sku}</span></td>
                        <td><span className="category-pill">{product.category}</span></td>
                        <td><div className="stock-cell"><strong>{product.quantity}</strong><div className="stock-track"><span className={isLow(product) ? "stock-fill low" : "stock-fill"} style={{ width: `${Math.min(100, product.quantity / Math.max(product.reorderLevel * 2, 1) * 100)}%` }} /></div><span className="stock-meta">Reorder at {product.reorderLevel}</span></div></td>
                        <td className="price-cell">{money.format(product.unitPrice)}</td>
                        <td><span className={`status ${isLow(product) ? "status-low" : "status-good"}`}><span />{isLow(product) ? "Low stock" : "In stock"}</span></td>
                        <td><div className="row-actions"><button aria-label={`Adjust ${product.name} stock`} title="Adjust stock" onClick={() => openDialog("adjust", product)}><PackagePlus size={15} /></button><button aria-label={`Edit ${product.name}`} title="Edit product" onClick={() => openDialog("edit", product)}><MoreHorizontal size={17} /></button><button aria-label={`Delete ${product.name}`} title="Delete product" onClick={() => deleteProduct(product)}><X size={15} /></button></div></td>
                      </tr>
                    ))}
                  {!loading && filteredProducts.length === 0 && <tr><td colSpan={8} className="empty-row"><div className="empty-state"><span><Box size={21} /></span><strong>No products found</strong><p>Try another search, or add your first product.</p><button className="text-button" onClick={() => openDialog("add")}>Add a product <ArrowUp size={13} /></button></div></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{filteredProducts.length ? 1 : 0}–{filteredProducts.length}</strong> of <strong>{filteredProducts.length}</strong> products</span><div className="pagination"><button disabled aria-label="Previous page">‹</button><button className="page-number">1</button><button disabled aria-label="Next page">›</button></div></div>
          </section>

          <section className="alerts-section" id="alerts">
            <div className="alerts-heading"><div><div className="section-title-line"><span className="alert-heading-icon"><AlertTriangle size={15} /></span><h2>Low stock alerts</h2><span className="product-count">{lowStock.length}</span></div><p>A heads-up on the items running low.</p></div><a href="#inventory" onClick={() => setCategory("Low stock")}>View all <ArrowUp size={13} /></a></div>
            {lowStock.length ? <div className="alert-list">{lowStock.slice(0, 3).map((product) => <div className="alert-row" key={product.id}><span className="alert-product-icon"><Box size={16} /></span><div className="alert-product"><strong>{product.name}</strong><span>{product.sku} · {product.category}</span></div><span className="alert-stock"><strong>{product.quantity}</strong> left</span><span className="alert-reorder">Reorder at {product.reorderLevel}</span><button className="restock-button" onClick={() => openDialog("adjust", product)}><Plus size={14} /> Restock</button></div>)}</div> : <div className="all-clear"><span>✓</span> You’re all caught up. No products need restocking.</div>}
          </section>
          <footer className="page-footer"><span>© 2025 Stockroom. A little more organized, every day.</span><span><span className="footer-online" /> All systems operational</span></footer>
        </div>
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><span className="modal-icon">{dialog === "adjust" ? <PackagePlus size={18} /> : <Box size={18} />}</span><div><h2 id="modal-title">{dialog === "add" ? "Add a product" : dialog === "edit" ? "Edit product" : "Adjust stock"}</h2><p>{dialog === "adjust" ? `Update the quantity for ${selected?.name}.` : "Keep your catalog details up to date."}</p></div></div><button className="close-button" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={18} /></button></div>
          {dialog === "adjust" ? <form onSubmit={saveAdjustment}>
            <div className="adjust-summary"><span className="product-art art-electronics"><Box size={17} /></span><div><strong>{selected?.name}</strong><span>{selected?.quantity} units currently in stock</span></div></div>
            <label>Quantity change<span className="adjust-controls"><button type="button" aria-label="Decrease quantity" onClick={() => setAdjustment((value) => value - 1)}><ArrowDown size={15} /></button><input type="number" value={adjustment} onChange={(event) => setAdjustment(Number(event.target.value))} /><button type="button" aria-label="Increase quantity" onClick={() => setAdjustment((value) => value + 1)}><ArrowUp size={15} /></button></span></label>
            <p className="field-hint">Use a positive number to add stock or a negative number to remove it.</p>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="primary-button">Update stock</button></div>
          </form> : <form onSubmit={saveProduct}>
            <div className="form-grid">
              <label className="full-field">Product name<input required maxLength={120} placeholder="e.g. Wireless headphones" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>SKU<input required maxLength={40} placeholder="e.g. WH-1001" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
              <label>Category<input required maxLength={60} placeholder="e.g. Electronics" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
              <label>Quantity in stock<input type="number" required min="0" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></label>
              <label>Reorder point<input type="number" required min="0" step="1" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: Number(event.target.value) })} /></label>
              <label className="full-field">Unit price<input type="number" required min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: Number(event.target.value) })} /></label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="primary-button">{dialog === "edit" ? "Save changes" : "Add product"}</button></div>
          </form>}
        </section>
      </div>}
      {notice && <div className="toast"><span>✓</span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={14} /></button></div>}
    </div>
  );
}

export default App;
