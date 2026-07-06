import React from 'react';
import './Card.css';

const Card = ({ children, className = '', isInteractive = false, ...props }) => {
  return (
    <div className={`generic-card ${isInteractive ? 'interactive' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Header = ({ children, icon, className = '' }) => (
  <div className="card-header-wrapper">
    {icon && <span className="card-icon">{icon}</span>}
    <h3 className={`card-header ${className}`}>{children}</h3>
  </div>
);

Card.Body = ({ children, className = '' }) => <div className={`card-body ${className}`}>{children}</div>;
Card.Footer = ({ children, className = '' }) => <div className={`card-footer ${className}`}>{children}</div>;

export default Card;