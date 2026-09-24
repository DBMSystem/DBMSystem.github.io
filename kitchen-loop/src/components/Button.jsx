import { spriteUrl } from '../assets/manifest.js';

// `icon`: key of a ui sprite (e.g. 'icon_recipe'), shown before the label when it exists.
export function Button({ children, variant = 'primary', icon, ...props }) {
  const src = icon && spriteUrl(`ui/${icon}`);
  return (
    <button type="button" className={`btn ${variant}`} {...props}>
      {src && <img className="btn-icon" src={src} alt="" />}
      {children}
    </button>
  );
}
