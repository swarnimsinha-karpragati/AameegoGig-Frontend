import React from 'react';
import './Card.css';
/**
 * @component Card
 * @description A highly flexible, generic Card component that supports standard dashboard grids, 
 * interactive states, and a modern side-by-side metric layout with dynamic icon backdrop styling.
 * 
 * @param {React.ReactNode} props.children - Child elements, typically using compound components: Card.Header, Card.Body, Card.Footer.
 * @param {React.ReactNode} [props.icon] - Optional icon component, SVG, or Emoji. Presence activates the horizontal stat-card layout.
 * @param {string} [props.iconClassName] - Preset background coloring for the icon box: 'blue' | 'green' | 'orange' | 'purple'.
 * @param {boolean} [props.isInteractive=false] - If true, adds a subtle lift hover effect, click feedback, and pointer cursor.
 * @param {string} [props.className] - Optional custom layout overrides or top-level status strings ('positive' | 'negative' | 'neutral').
 * @param {object} [props...props] - Forwards all valid HTML attributes (onClick, style, id, etc.) directly to the wrapper container.
 * 
 * @example
 * // 1. Standard Metric / Stat Card (Matching Image Style)
 * <Card icon="👥" iconClassName="blue" isInteractive>
 *   <Card.Header>Total Employees</Card.Header>
 *   <Card.Body>3</Card.Body>
 *   <Card.Footer className="positive">+1 joined this month</Card.Footer>
 * </Card>
 * 
 * @example
 * // 2. Financial Metrics with Status Overrides
 * <Card icon={<TrendingUp />} iconClassName="green">
 *   <Card.Header>Quarterly Revenue</Card.Header>
 *   <Card.Body>$24,500</Card.Body>
 *   <Card.Footer className="negative">-2.4% vs last month</Card.Footer>
 * </Card>
 */

const Card = ({ children, icon, className = '', isInteractive = false, iconClassName = '', ...props }) => {
  return (
    <div 
      className={`generic-card ${isInteractive ? 'interactive' : ''} ${icon ? 'stat-layout' : ''} ${className}`} 
      {...props}
    >
      {icon && (
        <div className={`card-icon-sidebar ${iconClassName}`}>
          {icon}
        </div>
      )}
      <div className="card-main-content">{children}</div>
    </div>
  );
};

Card.Header = ({ children, className = '' }) => (
  <h3 className={`card-header ${className}`}>{children}</h3>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`card-body ${className}`}>{children}</div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`card-footer ${className}`}>{children}</div>
);

export default Card;