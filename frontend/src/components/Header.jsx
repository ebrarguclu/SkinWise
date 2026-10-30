
import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo">
        SkinWise 🧴
      </Link>

      <nav className="navbar">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart 🛒</Link>
      </nav>
    </header>
  );
}

export default Header;
