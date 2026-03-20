import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import TodoList from './pages/TodoList';
import Admin from './pages/Admin';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <h1 className="nav-logo">Mega Glow Cosmetics</h1>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Dashboard
          </Link>
          <Link 
            to="/products" 
            className={location.pathname === '/products' ? 'active' : ''}
          >
            Products
          </Link>
          <Link 
            to="/sales" 
            className={location.pathname === '/sales' ? 'active' : ''}
          >
            Sales
          </Link>
          <Link 
            to="/todo" 
            className={location.pathname === '/todo' ? 'active' : ''}
          >
            To Do
          </Link>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/todo" element={<TodoList />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
