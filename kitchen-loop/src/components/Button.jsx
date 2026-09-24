export function Button({ children, variant = 'primary', ...props }) {
  return (
    <button type="button" className={`btn ${variant}`} {...props}>
      {children}
    </button>
  );
}
