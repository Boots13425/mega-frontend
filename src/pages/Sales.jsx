import { useState, useEffect } from 'react';
import { salesAPI, productsAPI } from '../services/api';
import SearchableDropdown from '../components/SearchableDropdown';

function Sales() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [saleForm, setSaleForm] = useState({
    product: '',
    quantity_sold: '1',
    selling_price_at_time: '',
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calculation, setCalculation] = useState({
    totalAmount: 0,
  });

  useEffect(() => {
    loadProducts();
    loadSales();
  }, []);

  useEffect(() => {
    if (selectedProduct && saleForm.quantity_sold) {
      const quantity = parseInt(saleForm.quantity_sold) || 0;
      const sellingPrice = parseInt(saleForm.selling_price_at_time) || selectedProduct.selling_price;  // Whole numbers only for XAF

      const totalAmount = sellingPrice * quantity;

      setCalculation({
        totalAmount,
      });
    }
  }, [selectedProduct, saleForm.quantity_sold, saleForm.selling_price_at_time]);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      const productsList = response.data.results || response.data || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll();
      const salesList = response.data.results || response.data || [];
      setSales(Array.isArray(salesList) ? salesList : []);
      setError(null);
    } catch (err) {
      setError('Failed to load sales. Please try again.');
      console.error('Sales API error:', err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    // product is now the full product object from SearchableDropdown
    setSelectedProduct(product);
    setSaleForm(prev => ({
      ...prev,
      product: product.id.toString(),
      selling_price_at_time: product ? product.selling_price.toString() : '',
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSaleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

      const quantity = parseInt(saleForm.quantity_sold);
      if (quantity > selectedProduct.quantity_in_stock) {
        setError(`Insufficient stock. Available: ${selectedProduct.quantity_in_stock}`);
        return;
      }

      try {
        setError(null);
        const data = {
          product: selectedProduct.id,
          quantity_sold: quantity,
          selling_price_at_time: parseInt(saleForm.selling_price_at_time) || selectedProduct.selling_price,  // Whole numbers only for XAF
        };

      await salesAPI.create(data);
      setSuccess('Sale recorded successfully!');
      setShowModal(false);
      setSaleForm({
        product: '',
        quantity_sold: '1',
        selling_price_at_time: '',
      });
      setSelectedProduct(null);
      loadSales();
      loadProducts(); // Reload to update stock
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.quantity_sold?.[0] || 'Failed to record sale. Please check your input.');
      console.error(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSaleForm({
      product: '',
      quantity_sold: '1',
      selling_price_at_time: '',
    });
    setSelectedProduct(null);
    setError(null);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sales</h1>
        <p>Record and view product sales</p>
      </div>

      {success && <div className="message message-success">{success}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Record New Sale
        </button>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
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
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.sale_date)}</td>
                    <td>{sale.product_name || sale.product_detail?.name}</td>
                    <td>{sale.product_detail?.category}</td>
                    <td>{sale.quantity_sold}</td>
                    <td className="currency">{formatCurrency(sale.selling_price_at_time)}</td>
                    <td className="currency">{formatCurrency(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record New Sale</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Select Product *</label>
                <SearchableDropdown
                  options={products.filter(p => p.quantity_in_stock > 0)}
                  onSelect={handleProductSelect}
                  value={saleForm.product}
                  placeholder="Type to search for a product..."
                  searchPlaceholder="Type product name, category, or ID..."
                  disabled={products.filter(p => p.quantity_in_stock > 0).length === 0}
                />
                <span className="help-text">
                  Type to search for a product by name, category, or ID. Use arrow keys to navigate, Enter to select.
                </span>
                {selectedProduct && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                      <strong>Available Stock:</strong> {selectedProduct.quantity_in_stock} units
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>
                      <strong> Selling Price:</strong> {formatCurrency(selectedProduct.selling_price)}
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
                    onChange={handleInputChange}
                    required
                    min="1"
                    max={selectedProduct?.quantity_in_stock || 1}
                    placeholder="1"
                  />
                  <span className="help-text">
                    {selectedProduct 
                      ? `Maximum available: ${selectedProduct.quantity_in_stock} units`
                      : 'Select a product first'}
                  </span>
                </div>

                <div className="form-group">
                  <label>Selling Price (per unit in XAF) *</label>
                  <input
                    type="number"
                    name="selling_price_at_time"
                    value={saleForm.selling_price_at_time}
                    onChange={handleInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder={selectedProduct?.selling_price || '0'}
                  />
                  <span className="help-text">Price at time of sale in XAF (whole number only, defaults to current price)</span>
                </div>
              </div>

              {/* Calculation Preview */}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#666' }}>Total Amount</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                        {formatCurrency(calculation.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={!selectedProduct || !saleForm.quantity_sold}
                >
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

export default Sales;
