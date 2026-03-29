import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './data/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import PartsInventory from './pages/PartsInventory';
import PartDetail from './pages/PartDetail';
import Harvesting from './pages/Harvesting';
import Orders from './pages/Orders';
import Vendors from './pages/Vendors';
import Warehouse from './pages/Warehouse';
import Scanner from './pages/Scanner';
import PartRequest from './pages/PartRequest';
import RunnerQueue from './pages/RunnerQueue';
import Settings from './pages/Settings';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="parts" element={<PartsInventory />} />
            <Route path="parts/:id" element={<PartDetail />} />
            <Route path="harvesting" element={<Harvesting />} />
            <Route path="orders" element={<Orders />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="request-parts" element={<PartRequest />} />
            <Route path="runner-queue" element={<RunnerQueue />} />
            <Route path="warehouse" element={<Warehouse />} />
            <Route path="warehouse/scanner" element={<Scanner />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
