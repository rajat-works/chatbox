import React, { forwardRef } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
        {label && <label className="input-group__label">{label}</label>}
        <div className="input-group__wrapper">
          {icon && <span className="input-group__icon">{icon}</span>}
          <input ref={ref} className="input-group__input" {...props} />
          {rightIcon && <span className="input-group__icon input-group__icon--right">{rightIcon}</span>}
        </div>
        {error && <span className="input-group__error">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
