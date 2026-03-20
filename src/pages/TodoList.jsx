import { useState, useEffect } from 'react';
import { todosAPI } from '../services/api';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    quantity_needed: '1',
    estimated_cost_per_unit: '',
    supplier_name: '',
    notes: '',
    status: 'pending',
  });

  useEffect(() => {
    loadTodos();
  }, [statusFilter]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      let response;
      if (statusFilter) {
        response = await todosAPI.getByStatus(statusFilter);
      } else {
        response = await todosAPI.getAll();
      }
      // Handle both paginated and non-paginated responses
      const todoData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setTodos(todoData);
      setError(null);
    } catch (err) {
      setError('Failed to load restock todos. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const data = {
        ...formData,
        quantity_needed: parseInt(formData.quantity_needed) || 1,
        estimated_cost_per_unit: parseFloat(formData.estimated_cost_per_unit),
      };

      if (editingTodo) {
        await todosAPI.update(editingTodo.id, data);
        setSuccess('Restock todo updated successfully!');
      } else {
        await todosAPI.create(data);
        setSuccess('Restock todo added successfully!');
      }

      setShowModal(false);
      resetForm();
      loadTodos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save restock todo. Please check your input.');
      console.error(err);
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      product_name: todo.product_name,
      category: todo.category,
      quantity_needed: todo.quantity_needed.toString(),
      estimated_cost_per_unit: todo.estimated_cost_per_unit.toString(),
      supplier_name: todo.supplier_name || '',
      notes: todo.notes || '',
      status: todo.status,
    });
    setShowModal(true);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await todosAPI.updateStatus(id, newStatus);
      setSuccess(`Todo marked as ${newStatus}!`);
      loadTodos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update status. Please try again.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restock todo?')) {
      return;
    }

    try {
      await todosAPI.delete(id);
      setSuccess('Restock todo deleted successfully!');
      loadTodos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete restock todo.');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: '',
      quantity_needed: '1',
      estimated_cost_per_unit: '',
      supplier_name: '',
      notes: '',
      status: 'pending',
    });
    setEditingTodo(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f39c12'; // Orange
      case 'completed':
        return '#27ae60'; // Green
      case 'postponed':
        return '#e74c3c'; // Red
      default:
        return '#666';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'completed':
        return 'badge-success';
      case 'postponed':
        return 'badge-danger';
      default:
        return 'badge';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Restock Todo</h1>
        <p>Manage products that need to be restocked</p>
      </div>

      {success && <div className="message message-success">{success}</div>}
      {error && <div className="message message-error">{error}</div>}

      {/* Filter and Add Button */}
      <div className="search-filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="postponed">Postponed</option>
        </select>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Add Restock Item
        </button>
      </div>

      {/* Todos List */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading restock todos...</div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <h3>No restock todos found</h3>
            <p>Add your first restock item to get started.</p>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  style={{
                    border: `3px solid ${getStatusColor(todo.status)}`,
                    borderRadius: '8px',
                    padding: '1.5rem',
                    background: '#f9f9f9',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: '#2c3e50' }}>{todo.product_name}</h3>
                    <span className={`badge ${getStatusBadgeClass(todo.status)}`}>
                      {todo.status.charAt(0).toUpperCase() + todo.status.slice(1)}
                    </span>
                  </div>

                  <p style={{ margin: '0.5rem 0', color: '#666' }}>
                    <strong>Category:</strong> {todo.category}
                  </p>
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>
                    <strong>Quantity:</strong> {todo.quantity_needed} units
                  </p>
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>
                    <strong>Est. Cost/Unit:</strong> {formatCurrency(todo.estimated_cost_per_unit)}
                  </p>
                  <p style={{ margin: '0.5rem 0', color: '#2c3e50', fontSize: '1.1rem', fontWeight: '600' }}>
                    <strong>Total Est. Cost:</strong> {formatCurrency(todo.total_estimated_cost)}
                  </p>

                  {todo.supplier_name && (
                    <p style={{ margin: '0.5rem 0', color: '#666' }}>
                      <strong>Supplier:</strong> {todo.supplier_name}
                    </p>
                  )}

                  {todo.notes && (
                    <div style={{ margin: '0.75rem 0', padding: '0.75rem', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #3498db' }}>
                      <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>
                        <strong>Notes:</strong> {todo.notes}
                      </p>
                    </div>
                  )}

                  <p style={{ margin: '0.5rem 0', color: '#999', fontSize: '0.85rem' }}>
                    Created: {new Date(todo.created_at).toLocaleDateString()}
                  </p>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {todo.status !== 'pending' && (
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem' }}
                        onClick={() => handleStatusChange(todo.id, 'pending')}
                      >
                        Pending
                      </button>
                    )}
                    {todo.status !== 'completed' && (
                      <button
                        className="btn btn-success"
                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem' }}
                        onClick={() => handleStatusChange(todo.id, 'completed')}
                      >
                        Done
                      </button>
                    )}
                    {todo.status !== 'postponed' && (
                      <button
                        className="btn btn-warning"
                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem' }}
                        onClick={() => handleStatusChange(todo.id, 'postponed')}
                      >
                        Postpone
                      </button>
                    )}
                  </div>

                  {/* Edit and Delete buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
                      onClick={() => handleEdit(todo)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
                      onClick={() => handleDelete(todo.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTodo ? 'Edit Restock Todo' : 'Add Restock Todo'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Rose Lipstick - Shade 12"
                />
                <span className="help-text">Name of the product to be restocked</span>
              </div>

              <div className="form-group">
                <label>Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Lipstick, Foundation, Mascara"
                />
                <span className="help-text">Product category</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Needed *</label>
                  <input
                    type="number"
                    name="quantity_needed"
                    value={formData.quantity_needed}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="1"
                  />
                  <span className="help-text">Number of units to restock</span>
                </div>

                <div className="form-group">
                  <label>Est. Cost per Unit (XAF) *</label>
                  <input
                    type="number"
                    name="estimated_cost_per_unit"
                    value={formData.estimated_cost_per_unit}
                    onChange={handleInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder="0"
                  />
                  <span className="help-text">Estimated cost in XAF</span>
                </div>
              </div>

              <div className="form-group">
                <label>Supplier Name</label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  placeholder="Optional supplier name"
                />
                <span className="help-text">Optional: Name of your supplier</span>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or reminders..."
                  style={{ minHeight: '100px' }}
                />
                <span className="help-text">Optional: Add any additional notes</span>
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                </select>
                <span className="help-text">Current status of this restock task</span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTodo ? 'Update Todo' : 'Save Todo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodoList;
