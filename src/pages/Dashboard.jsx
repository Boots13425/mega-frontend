import { useState, useEffect } from 'react';
import { reportingAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [dailySales, setDailySales] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ total_sales: 0, count: 0 });
  const [loadingDaily, setLoadingDaily] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadDailySales(selectedDate);
  }, []);

  useEffect(() => {
    // When selected date changes, reload daily sales
    loadDailySales(selectedDate);
  }, [selectedDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, topRes, deadRes] = await Promise.all([
        reportingAPI.getDashboardSummary(),
        reportingAPI.getTopProducts(),
        reportingAPI.getDeadStock(),
      ]);
      
      setSummary(summaryRes.data || {});
      setTopProducts(Array.isArray(topRes.data) ? topRes.data : []);
      setDeadStock(Array.isArray(deadRes.data) ? deadRes.data : []);
      setError(null);
    } catch (err) {
      console.error('Dashboard API error:', err);
      setSummary({});
      setTopProducts([]);
      setDeadStock([]);
      setError('Failed to load dashboard data. Backend might be starting up. Please refresh in a moment.');
    } finally {
      setLoading(false);
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

  const loadDailySales = async (date) => {
    try {
      setLoadingDaily(true);
      const res = await reportingAPI.getDailySales(date);
      setDailySales(res.data.sales || []);
      setDailyTotals({
        total_sales: res.data.total_sales || 0,
        count: res.data.count || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDaily(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="message message-error">{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your business performance</p>
      </div>

      {/* Summary Cards */}
      {/* Daily selector + quick view card */}
      <div style={{ margin: '1rem 0' }}>
        <label style={{ marginRight: '0.5rem' }}><strong>View sales for date:</strong></label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Total Sales Today</h3>
          <p className="value positive">{formatCurrency(summary?.today_sales || 0)}</p>
        </div>
        <div className="summary-card">
          <h3>Low Stock Items</h3>
          <p className="value warning">{summary?.low_stock_count || 0}</p>
        </div>
        <div className="summary-card">
          <h3>Dead Stock Items</h3>
          <p className="value danger">{summary?.dead_stock_count || 0}</p>
          {summary?.dead_stock_value > 0 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
              Value locked: {formatCurrency(summary.dead_stock_value)}
            </p>
          )}
        </div>
      </div>

      {/* Daily Sales Details */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2>Sales for {selectedDate}</h2>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div>Total Sales: <strong>{formatCurrency(dailyTotals.total_sales)}</strong></div>
            <div>Transactions: <strong>{dailyTotals.count}</strong></div>
          </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Top Selling Products */}
        <div className="card">
          <div className="card-header">
            <h2>Top 5 Selling Products</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product__name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_quantity" fill="#3498db" name="Quantity Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dead Stock List */}
      {deadStock.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Dead Stock Products</h2>
            <span className="badge badge-danger">{deadStock.length} items</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Quantity Remaining</th>
                  <th>Days Since Last Sale</th>
                  <th>Money Locked</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity_remaining}</td>
                    <td>{item.days_since_last_sale} days</td>
                    <td className="currency">{formatCurrency(item.money_locked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
