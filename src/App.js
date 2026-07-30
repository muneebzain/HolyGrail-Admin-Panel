import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPanelDashboard from './AdminPanelDashboard';
import UserDetails from './components/UserDetails';
import ProductDetails from './components/ProductDetails';
import OrderDetails from './components/OrderDetails'; // ✅ Add this line

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main dashboard route */}
          <Route path="/" element={<AdminPanelDashboard />} />

          {/* User details route */}
          <Route path="/user/:id" element={<UserDetails />} />

          {/* Product details route */}
          <Route path="/product/:productId" element={<ProductDetails />} />

          {/* ✅ Order details route */}
          <Route path="/order/:orderId" element={<OrderDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
