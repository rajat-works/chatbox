import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import './Auth.css';

const SplashPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page splash-page">
      <div className="splash-bg">
        <div className="splash-content">
          <div className="splash-logo">
            <div className="logo-icon">C</div>
            <span className="logo-text">Chatbox</span>
          </div>

          <h1 className="splash-title">
            Connect<br />friends<br />
            <span className="splash-highlight">easily &<br />quickly</span>
          </h1>

          <p className="splash-description">
            Our chat app is the perfect way to stay connected with friends and family.
          </p>

          <p className="splash-brand">by CoreWork</p>

          <div className="splash-buttons">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate('/login')}
            >
              Log in
            </Button>

            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => navigate('/register')}
              className="splash-signup-btn"
            >
              Create an account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
