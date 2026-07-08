import React from 'react';
import './Button.css';

const Button = ({ children, icon, iconPosition = 'left' ,className = '', ...props }) => {
  return (
    <button 
      className={`generic-btn ${className}`} 
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