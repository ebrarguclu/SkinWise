import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">Skin<span>Wise</span></div>
          <p className="muted">Skincare shopping personalised to your skin.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/cart">Cart</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/profile">Profile</Link>
          <Link to="/orders">My orders</Link>
          <Link to="/login">Log in</Link>
        </div>
        <div>
          <h4>Management</h4>
          <Link to="/admin">Admin panel</Link>
        </div>
      </div>
      <div className="footer-bottom">© 2026 SkinWise · CS 308 Software Engineering · Sabancı University</div>
    </footer>
  )
}
