import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Home from './pages/Home.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Orders from './pages/Orders.jsx'
import Wishlist from './pages/Wishlist.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminComments from './pages/admin/AdminComments.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="comments" element={<AdminComments />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>
    </Routes>
  )
}
