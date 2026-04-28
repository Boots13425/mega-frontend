import { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [searchTerm, categoryFilter, lowStockFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter) params.low_stock = 'true';
      
      const response = await productsAPI.getAll(params);
      const productsList = response.data.results || response.data || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
      setError(null);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Products API error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
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


  const formatCurrency = (amount) => {
    // Format as whole number XAF (CFA Franc) - no decimals
    const wholeAmount = Math.round(amount || 0);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(wholeAmount);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <p>Manage your product inventory</p>
      </div>

      {success && <div className="message message-success">{success}</div>}
      {error && <div className="message message-error">{error}</div>}

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search products by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
          />
          Low Stock Only
        </label>
      </div>

      {/* Products Table */}
      <div className="card">
        {loading ? (
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
                  <th>Selling Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.quantity_in_stock}</td>
                    <td className="currency">{formatCurrency(product.selling_price)}</td>
                    <td>
                      {product.is_low_stock ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;
