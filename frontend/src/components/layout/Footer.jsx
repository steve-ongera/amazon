// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom';

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="footer">
      <div className="footer-back-top" onClick={scrollTop}>
        Back to top
      </div>

      <div className="footer-main">
        <div className="footer-grid amz-container">
          <div className="footer-col">
            <div className="footer-col-title">Get to Know Us</div>
            <Link to="/about">About Amazon Kenya</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/press">Press Releases</Link>
            <Link to="/blog">Tech Blog</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Shop With Us</div>
            <Link to="/store">All Products</Link>
            <Link to="/store?filter=best_sellers">Best Sellers</Link>
            <Link to="/store?filter=new_arrivals">New Arrivals</Link>
            <Link to="/store?filter=deals">Today's Deals</Link>
            <Link to="/store?category=phones">Phones</Link>
            <Link to="/store?category=laptops">Laptops</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Customer Service</div>
            <Link to="/help">Help Center</Link>
            <Link to="/track-order">Track Your Order</Link>
            <Link to="/returns">Returns & Refunds</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/faq">FAQ</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Payment & Delivery</div>
            <a href="#mpesa">Pay with M-Pesa</a>
            <a href="#paypal">Pay with PayPal</a>
            <Link to="/delivery-info">Delivery Information</Link>
            <Link to="/pickup-stations">Pickup Stations</Link>
            <Link to="/shipping-policy">Shipping Policy</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-logo">
          <i className="bi bi-phone-fill" style={{ color: '#ff9900', marginRight: 6 }} />
          Amazon Kenya
        </div>
        <div className="footer-links">
          <Link to="/privacy">Privacy Notice</Link>
          <Link to="/terms">Conditions of Use</Link>
          <Link to="/help">Help</Link>
          <Link to="/cookies">Cookies Notice</Link>
          <Link to="/ads">Interest-Based Ads</Link>
        </div>
        <p>© {new Date().getFullYear()} Amazon Kenya. All rights reserved.</p>
        <p style={{ marginTop: 4 }}>
          <i className="bi bi-geo-alt-fill" style={{ marginRight: 4 }} />
          Nairobi, Kenya &nbsp;|&nbsp;
          <i className="bi bi-telephone-fill" style={{ marginRight: 4 }} />
          +254 700 000 000
        </p>
      </div>
    </footer>
  );
}