import React from 'react';
import './Avatar.css';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  showStatus = false,
  onClick,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeMap = {
    sm: 32,
    md: 44,
    lg: 56,
    xl: 80,
  };

  return (
    <div
      className={`avatar avatar--${size} ${onClick ? 'avatar--clickable' : ''} ${className}`}
      onClick={onClick}
      style={{ width: sizeMap[size], height: sizeMap[size] }}
    >
      {src ? (
        <img src={src} alt={name} className="avatar__image" />
      ) : (
        <div className="avatar__initials">{initials}</div>
      )}
      {showStatus && (
        <span
          className={`avatar__status ${isOnline ? 'avatar__status--online' : 'avatar__status--offline'}`}
        />
      )}
    </div>
  );
};

export default Avatar;
