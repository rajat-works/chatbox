import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUser,
  HiOutlineBellAlert,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineChevronRight,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../../components/common/Avatar/Avatar';
import './Settings.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, theme, toggleTheme } = useAuthStore();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/welcome');
    }
  };

  const settingsGroups = [
    {
      title: 'General',
      items: [
        {
          icon: HiOutlineUser,
          label: 'Account',
          description: 'Privacy, security, profile settings',
          onClick: () => navigate('/settings/profile'),
        },
        {
          icon: HiOutlineBellAlert,
          label: 'Notifications',
          description: 'Notification preferences',
          onClick: () => navigate('/settings/profile'),
        },
      ],
    },
  ];

  return (
    <div className="settings-page">
      <div className="settings__header">
        <h1 className="settings__title">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="settings__profile-card" onClick={() => navigate('/settings/profile')}>
        <Avatar
          src={user?.avatar}
          name={user?.name || 'U'}
          size="lg"
        />
        <div className="settings__profile-info">
          <h3 className="settings__profile-name">{user?.name || 'User'}</h3>
          <p className="settings__profile-bio">{user?.bio || 'Hey there! I\'m using CoreChat'}</p>
        </div>
        <HiOutlineChevronRight size={20} className="settings__profile-arrow" />
      </div>

      {/* Theme Toggle */}
      <div className="settings__theme-toggle" onClick={toggleTheme}>
        <div className="settings__theme-icon">
          {theme === 'dark' ? <HiOutlineMoon size={20} /> : <HiOutlineSun size={20} />}
        </div>
        <div className="settings__theme-info">
          <span className="settings__theme-label">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className="settings__theme-desc">
            Tap to switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </span>
        </div>
        <div className={`theme-switch ${theme === 'dark' ? 'theme-switch--active' : ''}`}>
          <div className="theme-switch__knob" />
        </div>
      </div>

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <div key={group.title} className="settings__group">
          <h4 className="settings__group-title">{group.title}</h4>
          {group.items.map((item) => (
            <div
              key={item.label}
              className="settings__item"
              onClick={item.onClick}
            >
              <div className="settings__item-icon">
                <item.icon size={20} />
              </div>
              <div className="settings__item-content">
                <span className="settings__item-label">{item.label}</span>
                <span className="settings__item-desc">{item.description}</span>
              </div>
              <HiOutlineChevronRight size={16} className="settings__item-arrow" />
            </div>
          ))}
        </div>
      ))}

      {/* Logout */}
      <div className="settings__logout" onClick={handleLogout}>
        <HiOutlineArrowRightOnRectangle size={20} />
        <span>Log Out</span>
      </div>

      {/* Footer */}
      <div className="settings__footer">
        <p>CoreChat by Corework</p>
        <p className="settings__version">Version 1.0.0</p>
      </div>
    </div>
  );
};

export default SettingsPage;
