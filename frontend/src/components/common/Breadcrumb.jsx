
// src/components/common/Breadcrumb.jsx
export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
