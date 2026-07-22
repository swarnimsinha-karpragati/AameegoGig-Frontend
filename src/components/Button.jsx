import React from 'react';
import './Button.css';

/**
 * @component Button
 * @description A highly reusable, generic button component featuring a built-in premium 
 * linear gradient background, smooth scale transitions, and flexible variant configurations.
 * 
 * @param {React.ReactNode} props.children - The primary text or label content inside the button.
 * @param {'primary' | 'secondary' | 'delete' | 'edit' | 'active' | 'not-active'} [props.variant='primary'] - Controls the color palette and structural variation of the button.
 * @param {React.ReactNode} [props.icon] - An optional icon element (Emoji, SVG, or font icon component).
 * @param {'left' | 'right'} [props.iconPosition='left'] - Determines whether the icon displays before (left) or after (right) the button text.
 * @param {string} [props.className] - Optional custom class string to merge for specific layout tweaks or style overrides.
 * @param {object} [props...props] - Forwards all valid HTML button elements (onClick, type, disabled, style, etc.) straight to the DOM node.
 * 
 * @example
 * // 1. Custom Action Button (Edit / Delete)
 * <Button variant="edit" icon="✏️">Edit Item</Button>
 * <Button variant="delete" icon="🗑️">Delete</Button>
 * 
 * @example
 * // 2. Toggle Status States (Active / Not Active)
 * <Button variant="active">Enabled</Button>
 * <Button variant="not-active">Disabled</Button>
 */

const VARIANT_CLASS = {
  primary: '',
  secondary: 'secondary-btn',
  delete: 'action-btn-delete',
  edit: 'action-btn-edit',
  active: 'active',
  'not-active': 'not-active',
};

const Button = ({
  children,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  className = '',
  ...props
}) => {
  const variantClass = VARIANT_CLASS[variant] || '';
  return (
    <button
      className={`generic-btn ${variantClass} ${className}`.trim()}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="btn-icon">{icon}</span>
      )}
      
      <span>{children}</span>
      
      {icon && iconPosition === 'right' && (
        <span className="btn-icon">{icon}</span>
      )}
    </button>
  );
};

export default Button;