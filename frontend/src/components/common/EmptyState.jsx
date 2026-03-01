
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