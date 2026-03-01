// src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    // ✅ This outer div is the full-height flex column
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
    }}>
      <Navbar />

      {/* flex: 1 makes this grow and push footer to bottom */}
      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>

      {/* Footer is a direct child of the flex column — NOT inside main */}
      <Footer />
    </div>
  );
}