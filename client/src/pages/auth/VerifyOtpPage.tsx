import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button/Button';
import toast from 'react-hot-toast';
import './Auth.css';

const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp } = useAuthStore();
  const email = (location.state as any)?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter the complete OTP');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(email, otpString);
      toast.success('Email verified! Welcome to CoreChat!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          <HiArrowLeft size={22} />
        </button>

        <div className="auth-header">
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
        </div>

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-input"
              inputMode="numeric"
            />
          ))}
        </div>

        <Button
          variant="primary"
          fullWidth
          size="lg"
          isLoading={isLoading}
          onClick={handleVerify}
        >
          Verify
        </Button>

        <p className="auth-link-text" style={{ marginTop: 20 }}>
          Didn't receive code?{' '}
          <a className="auth-link" onClick={() => toast('OTP resent!')}>
            Resend
          </a>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
