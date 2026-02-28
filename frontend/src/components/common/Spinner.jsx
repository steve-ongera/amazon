// src/components/common/Spinner.jsx
export function Spinner() {
  return <div className="loading-center"><div className="spinner" /></div>;
}

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

// src/components/common/EmptyState.jsx
export function EmptyState({ icon = 'bi-inbox', title, text, action }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon} empty-state-icon`} />
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action}
    </div>
  );
}