import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPanelDashboard from './AdminPanelDashboard';
import UserDetails from './components/UserDetails';
import ProductDetails from './components/ProductDetails';
import OrderDetails from './components/OrderDetails';
import RequireAdmin from './components/RequireAdmin';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<AdminPanelDashboard />} />
          <Route path="/user/:id" element={<RequireAdmin><UserDetails /></RequireAdmin>} />
          <Route path="/product/:productId" element={<RequireAdmin><ProductDetails /></RequireAdmin>} />
          <Route path="/order/:orderId" element={<RequireAdmin><OrderDetails /></RequireAdmin>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
