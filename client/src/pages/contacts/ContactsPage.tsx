import React, { useState, useEffect, useMemo } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import { usersAPI, chatAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../../components/common/Avatar/Avatar';
import { useChatStore } from '../../stores/chatStore';
import { UserPublic } from '../../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Contacts.css';

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { onlineUsers } = useChatStore();
  const [contacts, setContacts] = useState<UserPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data } = await usersAPI.getContacts();
      setContacts(data.data || data || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Search users (debounced effect)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await usersAPI.searchUsers(searchQuery.trim());
        setSearchResults(data.data || data || []);
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Sort contacts alphabetically and group by letter
  const groupedContacts = useMemo(() => {
    const sorted = [...contacts].sort((a, b) =>
      (a.name || a.displayName || '').localeCompare(b.name || b.displayName || ''),
    );
    const groups: Record<string, UserPublic[]> = {};
    sorted.forEach((c) => {
      const letter = (c.name || c.displayName || '?')[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    });
    return groups;
  }, [contacts]);

  const handleContactClick = async (contact: UserPublic) => {
    try {
      const { data } = await chatAPI.createConversation(contact._id);
      const conv = data.data || data;
      const convId = conv._id;
      if (convId) navigate(`/chat/${convId}`);
    } catch (error: any) {
      toast.error('Could not open chat');
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await usersAPI.addFriend(userId);
      toast.success('Friend added!');
      loadContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add friend');
    }
  };

  const displayList = searchQuery.trim().length >= 2 ? searchResults : null;

  return (
    <div className="contacts-page">
      <div className="contacts__header">
        <h1 className="contacts__title">Contacts</h1>
      </div>

      {/* Search */}
      <div className="contacts__search">
        <div className="search-input">
          <HiOutlineMagnifyingGlass className="search-input__icon" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input__field"
          />
        </div>
      </div>

      <div className="contacts__list">
        {/* Search results */}
        {displayList ? (
          isSearching ? (
            <div className="contacts__empty">
              <div className="spinner" />
              <p>Searching...</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="contacts__empty">
              <p>No users found</p>
            </div>
          ) : (
            displayList.map((u) => (
              <div key={u._id} className="contact-item">
                <Avatar
                  src={u.avatar}
                  name={u.name || u.displayName || 'U'}
                  size="md"
                  showStatus
                  isOnline={onlineUsers.includes(u._id)}
                />
                <div className="contact-item__content">
                  <span className="contact-item__name">{u.name || u.displayName}</span>
                  <span className="contact-item__bio">{u.bio || ''}</span>
                </div>
                <button className="icon-btn" onClick={() => handleAddFriend(u._id)} title="Add friend">
                  <HiOutlineUserPlus size={20} />
                </button>
              </div>
            ))
          )
        ) : isLoading ? (
          <div className="contacts__empty">
            <div className="spinner" />
            <p>Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="contacts__empty">
            <HiOutlineUserPlus size={48} />
            <h3>No contacts yet</h3>
            <p>Search for people to add as friends</p>
          </div>
        ) : (
          /* Grouped Alphabetical List */
          Object.keys(groupedContacts)
            .sort()
            .map((letter) => (
              <div key={letter} className="contact-group">
                <div className="contact-group__letter">{letter}</div>
                {groupedContacts[letter].map((contact) => (
                  <div
                    key={contact._id}
                    className="contact-item"
                    onClick={() => handleContactClick(contact)}
                  >
                    <Avatar
                      src={contact.avatar}
                      name={contact.name || contact.displayName || 'U'}
                      size="md"
                      showStatus
                      isOnline={onlineUsers.includes(contact._id)}
                    />
                    <div className="contact-item__content">
                      <span className="contact-item__name">
                        {contact.name || contact.displayName}
                      </span>
                      <span className="contact-item__bio">
                        {contact.bio || 'Hey there! I\'m using CoreChat'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
