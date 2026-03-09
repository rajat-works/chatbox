import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { useAuthStore } from '../../stores/authStore';
import { usersAPI, uploadAPI } from '../../services/api';
import Avatar from '../../components/common/Avatar/Avatar';
import { PrivacyOption } from '../../types';
import toast from 'react-hot-toast';
import './Settings.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // Privacy settings
  const [profileImagePrivacy, setProfileImagePrivacy] = useState<PrivacyOption>(
    user?.profileImagePrivacy || 'everyone',
  );
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<PrivacyOption>(
    user?.lastSeenPrivacy || 'everyone',
  );
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<PrivacyOption>(
    user?.onlineStatusPrivacy || 'everyone',
  );
  const [isSearchable, setIsSearchable] = useState<boolean>(
    user?.isSearchable !== false,
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    try {
      const { data } = await usersAPI.updateAvatar(file);
      updateUser({ avatar: data.avatar || data.data?.avatar });
      toast.success('Avatar updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update avatar');
    }
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data } = await usersAPI.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      });
      updateUser(data.data || data);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await usersAPI.updatePrivacy({
        profileImagePrivacy,
        lastSeenPrivacy,
        onlineStatusPrivacy,
        isSearchable,
      });
      updateUser({ profileImagePrivacy, lastSeenPrivacy, onlineStatusPrivacy, isSearchable });
      toast.success('Privacy settings updated');
    } catch (error: any) {
      toast.error('Failed to update privacy settings');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }
    try {
      await usersAPI.deleteAccount(deletePassword);
      toast.success('Account deleted');
      await logout();
      navigate('/welcome');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const privacyOptions: { value: PrivacyOption; label: string }[] = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'friends', label: 'Friends only' },
    { value: 'nobody', label: 'Nobody' },
  ];

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile__header">
        <button className="icon-btn" onClick={() => navigate('/settings')}>
          <HiOutlineArrowLeft size={22} />
        </button>
        <h2 className="profile__header-title">Profile</h2>
        <button
          className="icon-btn"
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
        >
          <HiOutlinePencil size={20} />
        </button>
      </div>

      <div className="profile__content">
        {/* Avatar Section */}
        <div className="profile__avatar-section">
          <div className="profile__avatar-wrapper">
            <Avatar
              src={user?.avatar}
              name={user?.name || 'U'}
              size="xl"
            />
            <button
              className="profile__avatar-edit"
              onClick={() => fileInputRef.current?.click()}
            >
              <HiOutlineCamera size={18} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
          <h3 className="profile__display-name">{user?.name}</h3>
          <p className="profile__email">{user?.email}</p>
        </div>

        {/* Profile Fields */}
        <div className="profile__section">
          <h4 className="profile__section-title">Personal Info</h4>

          <div className="profile__field">
            <label className="profile__field-label">Display Name</label>
            {isEditing ? (
              <input
                type="text"
                className="profile__field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
            ) : (
              <span className="profile__field-value">{user?.name || '—'}</span>
            )}
          </div>

          <div className="profile__field">
            <label className="profile__field-label">Bio</label>
            {isEditing ? (
              <textarea
                className="profile__field-input profile__field-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                maxLength={200}
                rows={3}
              />
            ) : (
              <span className="profile__field-value">{user?.bio || 'Hey there! I\'m using CoreChat'}</span>
            )}
          </div>

          <div className="profile__field">
            <label className="profile__field-label">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                className="profile__field-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            ) : (
              <span className="profile__field-value">{user?.phone || '—'}</span>
            )}
          </div>

          <div className="profile__field">
            <label className="profile__field-label">Email</label>
            <span className="profile__field-value profile__field-value--readonly">
              {user?.email || '—'}
            </span>
          </div>

          {isEditing && (
            <div className="profile__field-actions">
              <button
                className="btn btn--primary btn--block"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="btn btn--outline btn--block"
                onClick={() => {
                  setIsEditing(false);
                  setName(user?.name || '');
                  setBio(user?.bio || '');
                  setPhone(user?.phone || '');
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Privacy Section */}
        <div className="profile__section">
          <h4 className="profile__section-title">
            <HiOutlineShieldCheck size={18} />
            Privacy
          </h4>

          <div className="profile__privacy-item">
            <div className="profile__privacy-info">
              <HiOutlineEye size={18} />
              <span>Profile Photo</span>
            </div>
            <select
              className="profile__privacy-select"
              value={profileImagePrivacy}
              onChange={(e) => {
                setProfileImagePrivacy(e.target.value as PrivacyOption);
                setTimeout(handleSavePrivacy, 100);
              }}
            >
              {privacyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="profile__privacy-item">
            <div className="profile__privacy-info">
              <HiOutlineEyeSlash size={18} />
              <span>Last Seen</span>
            </div>
            <select
              className="profile__privacy-select"
              value={lastSeenPrivacy}
              onChange={(e) => {
                setLastSeenPrivacy(e.target.value as PrivacyOption);
                setTimeout(handleSavePrivacy, 100);
              }}
            >
              {privacyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="profile__privacy-item">
            <div className="profile__privacy-info">
              <HiOutlineEye size={18} />
              <span>Online Status</span>
            </div>
            <select
              className="profile__privacy-select"
              value={onlineStatusPrivacy}
              onChange={(e) => {
                setOnlineStatusPrivacy(e.target.value as PrivacyOption);
                setTimeout(handleSavePrivacy, 100);
              }}
            >
              {privacyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="profile__privacy-item">
            <div className="profile__privacy-info">
              <HiOutlineMagnifyingGlass size={18} />
              <span>Visible in Search</span>
            </div>
            <label className="profile__toggle">
              <input
                type="checkbox"
                checked={isSearchable}
                onChange={(e) => {
                  setIsSearchable(e.target.checked);
                  setTimeout(handleSavePrivacy, 100);
                }}
              />
              <span className="profile__toggle-slider" />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="profile__section profile__section--danger">
          <h4 className="profile__section-title profile__section-title--danger">
            <HiOutlineTrash size={18} />
            Danger Zone
          </h4>

          {!showDeleteConfirm ? (
            <button
              className="btn btn--danger btn--block"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </button>
          ) : (
            <div className="profile__delete-confirm">
              <p className="profile__delete-warning">
                This action is irreversible. All your data will be permanently deleted.
              </p>
              <input
                type="password"
                className="profile__field-input"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <div className="profile__delete-actions">
                <button
                  className="btn btn--danger"
                  onClick={handleDeleteAccount}
                >
                  Delete Forever
                </button>
                <button
                  className="btn btn--outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
