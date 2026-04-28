import { useState, useEffect } from 'react';
import { productsAPI, salesAPI, reportingAPI, authAPI, setAdminToken, clearAdminToken, getAdminToken } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SearchableDropdown from '../components/SearchableDropdown';

function Admin() {
  const [token, setToken] = useState(() => getAdminToken());
  const [loginUsername, setLoginUsername] = useState('megaglow');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin analytics
  const [summary, setSummary] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailySales, setDailySales] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ total_sales: 0, total_profit: 0, count: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Admin product management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [productsSuccess, setProductsSuccess] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost_price: '',
    selling_price: '',
    quantity_in_stock: '',
    low_stock_threshold: '10',
    last_restocked_date: '',
    supplier_name: '',
  });

  // Admin sales (profit-enabled view)
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState(null);
  const [salesSuccess, setSalesSuccess] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleForm, setSaleForm] = useState({
    product: '',
    quantity_sold: '1',
    selling_price_at_time: '',
  });
  const [calculation, setCalculation] = useState({ totalAmount: 0, profit: 0 });

  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  useEffect(() => {
    const t = getAdminToken();
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    loadAnalytics();
    loadDailySales(selectedDate);
    loadProducts();
    loadCategories();
    loadSales();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadProducts();
  }, [token, searchTerm, categoryFilter, lowStockFilter]);

  useEffect(() => {
    if (!token) return;
    loadDailySales(selectedDate);
  }, [token, selectedDate]);

  useEffect(() => {
    if (selectedProduct && saleForm.quantity_sold) {
      const quantity = parseInt(saleForm.quantity_sold) || 0;
      const sellingPrice = parseInt(saleForm.selling_price_at_time) || selectedProduct.selling_price;
      const costPrice = selectedProduct.cost_price;
      const totalAmount = sellingPrice * quantity;
      const profit = (sellingPrice - costPrice) * quantity;
      setCalculation({ totalAmount, profit });
    }
  }, [selectedProduct, saleForm.quantity_sold, saleForm.selling_price_at_time]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await authAPI.login(loginUsername.trim(), loginPassword);
      const key = res.data?.token;
      if (key) {
        setAdminToken(key);
        setToken(key);
      } else {
        setLoginError('Invalid response from server.');
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed. Check username and password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setToken(null);
    setLoginPassword('');
    setImportResult(null);
    setImportError(null);
    setProductsSuccess(null);
    setProductsError(null);
    setSalesSuccess(null);
    setSalesError(null);
  };

  const formatCurrency = (amount) => {
    const wholeAmount = Math.round(amount || 0);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(wholeAmount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [summaryRes, trendRes] = await Promise.all([
        reportingAPI.getDashboardSummary(),
        reportingAPI.getMonthlyTrend(),
      ]);
      setSummary(summaryRes.data || {});
      const trendList = trendRes.data || [];
      setMonthlyTrend(Array.isArray(trendList) ? trendList : []);
    } catch (err) {
      // Keep admin page usable even if analytics fail
      console.error('Analytics API error:', err);
      setSummary({});
      setMonthlyTrend([]);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadDailySales = async (date) => {
    setLoadingDaily(true);
    try {
      const res = await reportingAPI.getDailySales(date);
      setDailySales(res.data.sales || []);
      setDailyTotals({
        total_sales: res.data.total_sales || 0,
        total_profit: res.data.total_profit || 0,
        count: res.data.count || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter) params.low_stock = 'true';
      const response = await productsAPI.getAll(params);
      const productsList = response.data.results || response.data || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
      setProductsError(null);
    } catch (err) {
      setProductsError('Failed to load products. Please try again.');
      console.error('Products API error:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      const categoriesList = response.data || [];
      setCategories(Array.isArray(categoriesList) ? categoriesList : []);
    } catch (err) {
      console.error('Categories API error:', err);
      setCategories([]);
    }
  };

  const resetProductForm = () => {
    setFormData({
      name: '',
      category: '',
      cost_price: '',
      selling_price: '',
      quantity_in_stock: '',
      low_stock_threshold: '10',
      last_restocked_date: '',
      supplier_name: '',
    });
    setEditingProduct(null);
  };

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openNewProductModal = () => {
    resetProductForm();
    setShowProductModal(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity_in_stock: product.quantity_in_stock,
      low_stock_threshold: product.low_stock_threshold,
      last_restocked_date: product.last_restocked_date || '',
      supplier_name: product.supplier_name || '',
    });
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    resetProductForm();
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      setProductsError(null);
      const data = {
        ...formData,
        cost_price: parseInt(formData.cost_price) || 0,
        selling_price: parseInt(formData.selling_price) || 0,
        quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        last_restocked_date: formData.last_restocked_date || null,
        supplier_name: formData.supplier_name || null,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
        setProductsSuccess('Product updated successfully!');
      } else {
        await productsAPI.create(data);
        setProductsSuccess('Product added successfully!');
      }

      setShowProductModal(false);
      resetProductForm();
      loadProducts();
      setTimeout(() => setProductsSuccess(null), 3000);
    } catch (err) {
      setProductsError(
        err.response?.data?.error ||
          err.response?.data?.selling_price?.[0] ||
          'Failed to save product. Please check your input.'
      );
      console.error(err);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      setProductsSuccess('Product deleted successfully!');
      loadProducts();
      setTimeout(() => setProductsSuccess(null), 3000);
    } catch (err) {
      setProductsError('Failed to delete product.');
      console.error(err);
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const response = await salesAPI.getAll();
      const salesList = response.data.results || response.data || [];
      setSales(Array.isArray(salesList) ? salesList : []);
      setSalesError(null);
    } catch (err) {
      setSalesError('Failed to load sales. Please try again.');
      console.error('Sales API error:', err);
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSaleForm((prev) => ({
      ...prev,
      product: product.id.toString(),
      selling_price_at_time: product ? product.selling_price.toString() : '',
    }));
  };

  const handleSaleInputChange = (e) => {
    const { name, value } = e.target;
    setSaleForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeSaleModal = () => {
    setShowSaleModal(false);
    setSaleForm({ product: '', quantity_sold: '1', selling_price_at_time: '' });
    setSelectedProduct(null);
    setSalesError(null);
  };

  const recordSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setSalesError('Please select a product');
      return;
    }
    const quantity = parseInt(saleForm.quantity_sold);
    if (quantity > selectedProduct.quantity_in_stock) {
      setSalesError(`Insufficient stock. Available: ${selectedProduct.quantity_in_stock}`);
      return;
    }
    try {
      setSalesError(null);
      const data = {
        product: selectedProduct.id,
        quantity_sold: quantity,
        selling_price_at_time: parseInt(saleForm.selling_price_at_time) || selectedProduct.selling_price,
      };
      await salesAPI.create(data);
      setSalesSuccess('Sale recorded successfully!');
      setShowSaleModal(false);
      setSaleForm({ product: '', quantity_sold: '1', selling_price_at_time: '' });
      setSelectedProduct(null);
      loadSales();
      loadProducts();
      loadAnalytics();
      loadDailySales(selectedDate);
      setTimeout(() => setSalesSuccess(null), 3000);
    } catch (err) {
      setSalesError(
        err.response?.data?.error ||
          err.response?.data?.quantity_sold?.[0] ||
          'Failed to record sale. Please check your input.'
      );
      console.error(err);
    }
  };

  const handleTemplateDownload = async () => {
    setTemplateLoading(true);
    setImportError(null);
    try {
      const blob = await productsAPI.downloadExcelTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Failed to download template. Ensure you are logged in.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const res = await productsAPI.importExcel(importFile);
      setImportResult(res.data);
      setImportFile(null);
      const fileInput = document.getElementById('admin-excel-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed. Ensure you are logged in as admin.');
    } finally {
      setImporting(false);
    }
  };

  if (token == null || token === '') {
    return (
      <div>
        <div className="page-header">
          <h1>Admin</h1>
          <p>Sign in to access product import and other admin features</p>
        </div>
        <div className="card" style={{ maxWidth: '420px', margin: '2rem auto' }}>
          <div className="card-header">
            <h2>Admin login</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="megaglow"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password"
              />
            </div>
            {loginError && (
              <div className="message message-error" style={{ marginBottom: '1rem' }}>
                {loginError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Admin</h1>
          <p>Simple tools for product management and business insights</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Quick insights (admin-only) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Quick insights</h2>
        </div>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
          These numbers include profit and are visible only in the Admin area.
        </p>
        {loadingAnalytics ? (
          <div className="loading">Loading insights...</div>
        ) : (
          <div className="summary-grid" style={{ marginBottom: 0 }}>
            <div className="summary-card">
              <h3>Total Sales Today</h3>
              <p className="value positive">{formatCurrency(summary?.today_sales || 0)}</p>
            </div>
            <div className="summary-card">
              <h3>Total Profit Today</h3>
              <p className="value positive">{formatCurrency(summary?.today_profit || 0)}</p>
            </div>
            <div className="summary-card">
              <h3>Low Stock Items</h3>
              <p className="value warning">{summary?.low_stock_count || 0}</p>
            </div>
            <div className="summary-card">
              <h3>Dead Stock Items</h3>
              <p className="value danger">{summary?.dead_stock_count || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin daily sales (with profit) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Sales for a specific day</h2>
        </div>
        <div style={{ margin: '0.5rem 0 1rem 0' }}>
          <label style={{ marginRight: '0.5rem' }}><strong>Select date:</strong></label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>Total Sales: <strong>{formatCurrency(dailyTotals.total_sales)}</strong></div>
          <div>Total Profit: <strong>{formatCurrency(dailyTotals.total_profit)}</strong></div>
          <div>Transactions: <strong>{dailyTotals.count}</strong></div>
        </div>
        {loadingDaily ? (
          <div className="loading">Loading daily sales...</div>
        ) : dailySales.length === 0 ? (
          <div style={{ padding: '1rem' }}>No sales recorded for this date.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.sale_date).toLocaleTimeString()}</td>
                    <td>{s.product_name}</td>
                    <td>{s.quantity_sold}</td>
                    <td className="currency">{formatCurrency(s.selling_price_at_time)}</td>
                    <td className="currency">{formatCurrency(s.total_amount)}</td>
                    <td className="currency" style={{ color: '#27ae60', fontWeight: '600' }}>{formatCurrency(s.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly sales trend (admin-only) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Monthly Sales Trend</h2>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month_name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="total_sales" stroke="#3498db" strokeWidth={2} name="Sales" />
            <Line type="monotone" dataKey="total_profit" stroke="#27ae60" strokeWidth={2} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Product management (admin-only) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Product management</h2>
          <button className="btn btn-primary" onClick={openNewProductModal}>
            Add New Product
          </button>
        </div>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Use the filters to find items quickly. You can add, edit, or remove products here.
        </p>
        {productsSuccess && <div className="message message-success">{productsSuccess}</div>}
        {productsError && <div className="message message-error">{productsError}</div>}

        <div className="search-filter-bar">
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={lowStockFilter} onChange={(e) => setLowStockFilter(e.target.checked)} />
            Low Stock Only
          </label>
        </div>

        {loadingProducts ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3>No products found</h3>
            <p>Add your first product to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.quantity_in_stock}</td>
                    <td className="currency">{formatCurrency(p.cost_price)}</td>
                    <td className="currency">{formatCurrency(p.selling_price)}</td>
                    <td>
                      {p.is_low_stock ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        onClick={() => openEditProductModal(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        onClick={() => deleteProduct(p.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales management (admin-only) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Sales (admin view)</h2>
          <button className="btn btn-primary" onClick={() => setShowSaleModal(true)}>
            Record New Sale
          </button>
        </div>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
          This view includes profit. Use it for checks and reporting.
        </p>
        {salesSuccess && <div className="message message-success">{salesSuccess}</div>}
        {salesError && <div className="message message-error">{salesError}</div>}
        {loadingSales ? (
          <div className="loading">Loading sales...</div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <h3>No sales recorded yet</h3>
            <p>Record your first sale to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Price per Unit</th>
                  <th>Total Amount</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDateTime(s.sale_date)}</td>
                    <td>{s.product_name || s.product_detail?.name}</td>
                    <td>{s.product_detail?.category}</td>
                    <td>{s.quantity_sold}</td>
                    <td className="currency">{formatCurrency(s.selling_price_at_time)}</td>
                    <td className="currency">{formatCurrency(s.total_amount)}</td>
                    <td className="currency" style={{ color: '#27ae60', fontWeight: '600' }}>
                      {formatCurrency(s.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import from Excel */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Import from Excel</h2>
        </div>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Upload an Excel file (.xlsx or .xls) to add or update products in bulk. Use the template to get the correct column format.
        </p>
        <form onSubmit={handleImportSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTemplateDownload}
              disabled={templateLoading}
              style={{ marginRight: '1rem' }}
            >
              {templateLoading ? 'Downloading…' : 'Download Excel Template'}
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select file</label>
            <input
              id="admin-excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              style={{ maxWidth: '400px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!importFile || importing}
            >
              {importing ? 'Importing…' : 'Upload and Import'}
            </button>
            {importing && <span className="loading" style={{ padding: 0, margin: 0 }}>Processing file…</span>}
          </div>
        </form>
        {importError && (
          <div className="message message-error" style={{ marginTop: '1rem' }}>
            {importError}
          </div>
        )}
        {importResult && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <div className="message message-success" style={{ marginBottom: '1rem' }}>
              Import finished.
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div><strong>Products imported/updated:</strong> {importResult.imported ?? 0}</div>
              <div><strong>Rows skipped:</strong> {importResult.skipped ?? 0}</div>
              <div><strong>Errors:</strong> {(importResult.errors || []).length}</div>
            </div>
            {(importResult.errors || []).length > 0 && (
              <div>
                <strong>Error details:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  {importResult.errors.map((err, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product modal (admin-only) */}
      {showProductModal && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={closeProductModal}>×</button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleProductInputChange}
                  required
                  placeholder="e.g., Rose Lipstick - Shade 12"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleProductInputChange}
                  required
                  placeholder="e.g., Lipstick, Foundation, Mascara"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost Price (per unit in XAF) *</label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleProductInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (per unit in XAF) *</label>
                  <input
                    type="number"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleProductInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity in Stock *</label>
                  <input
                    type="number"
                    name="quantity_in_stock"
                    value={formData.quantity_in_stock}
                    onChange={handleProductInputChange}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Low Stock Threshold *</label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    value={formData.low_stock_threshold}
                    onChange={handleProductInputChange}
                    required
                    min="0"
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Restocked Date</label>
                  <input
                    type="date"
                    name="last_restocked_date"
                    value={formData.last_restocked_date}
                    onChange={handleProductInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleProductInputChange}
                    placeholder="Optional supplier name"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeProductModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record sale modal (admin-only, shows profit) */}
      {showSaleModal && (
        <div className="modal-overlay" onClick={closeSaleModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record New Sale (Admin)</h2>
              <button className="modal-close" onClick={closeSaleModal}>×</button>
            </div>
            <form onSubmit={recordSale}>
              <div className="form-group">
                <label>Select Product *</label>
                <SearchableDropdown
                  options={products.filter((p) => p.quantity_in_stock > 0)}
                  onSelect={handleProductSelect}
                  value={saleForm.product}
                  placeholder="Type to search for a product..."
                  searchPlaceholder="Type product name, category, or ID..."
                  disabled={products.filter((p) => p.quantity_in_stock > 0).length === 0}
                />
                {selectedProduct && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                      <strong>Available Stock:</strong> {selectedProduct.quantity_in_stock} units
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>
                      <strong>Cost Price:</strong> {formatCurrency(selectedProduct.cost_price)} | <strong>Selling Price:</strong> {formatCurrency(selectedProduct.selling_price)}
                    </p>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Sold *</label>
                  <input
                    type="number"
                    name="quantity_sold"
                    value={saleForm.quantity_sold}
                    onChange={handleSaleInputChange}
                    required
                    min="1"
                    max={selectedProduct?.quantity_in_stock || 1}
                    placeholder="1"
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (per unit in XAF) *</label>
                  <input
                    type="number"
                    name="selling_price_at_time"
                    value={saleForm.selling_price_at_time}
                    onChange={handleSaleInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder={selectedProduct?.selling_price || '0'}
                  />
                </div>
              </div>

              {selectedProduct && saleForm.quantity_sold && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: '#e8f4f8',
                  borderRadius: '6px',
                  border: '2px solid #3498db'
                }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#2c3e50' }}>
                    Sale Summary
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#666' }}>Total Amount</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                        {formatCurrency(calculation.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#666' }}>Profit</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#27ae60' }}>
                        {formatCurrency(calculation.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeSaleModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={!selectedProduct || !saleForm.quantity_sold}>
                  Confirm Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
