import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserGroup,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import socketService from '../../services/socket';
import Avatar from '../../components/common/Avatar/Avatar';
import './Layout.css';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, loadUser, isLoading } = useAuthStore();
  const { loadConversations, addMessage, updateConversationLastMessage, addOnlineUser, removeOnlineUser, setOnlineUsers, setTypingUser } = useChatStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, []);

  const setupSocketListeners = useCallback(() => {
    const chatSocket = socketService.getChatSocket();
    if (!chatSocket) return;

    // Remove any previous listeners to avoid duplicates
    chatSocket.off('message:new');
    chatSocket.off('user:online');
    chatSocket.off('user:offline');
    chatSocket.off('users:online');
    chatSocket.off('typing:start');
    chatSocket.off('typing:stop');

    chatSocket.on('message:new', (message: any) => {
      addMessage(message);
      updateConversationLastMessage(message.conversation, message);

      // Browser notification if tab is not focused
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const senderName = message.sender?.name || message.sender?.displayName || 'New message';
        const body = message.type === 'text' ? (message.content || '') : `[${message.type}]`;
        try {
          new Notification(senderName, {
            body,
            icon: message.sender?.avatar || '/favicon.svg',
            tag: message.conversation,
          });
        } catch {
          // Notification API not available
        }
      }
    });

    chatSocket.on('user:online', (data: any) => {
      addOnlineUser(data.userId);
    });

    chatSocket.on('user:offline', (data: any) => {
      removeOnlineUser(data.userId);
    });

    chatSocket.on('users:online', (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    chatSocket.on('typing:start', (data: any) => {
      setTypingUser(data.conversationId, data.userId, true);
    });

    chatSocket.on('typing:stop', (data: any) => {
      setTypingUser(data.conversationId, data.userId, false);
    });

    // Request current online users
    socketService.getOnlineUsers();
  }, [addMessage, updateConversationLastMessage, addOnlineUser, removeOnlineUser, setOnlineUsers, setTypingUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/welcome');
      return;
    }

    if (user) {
      loadConversations();

      // Setup socket listeners – handle both already-connected and pending connections
      const chatSocket = socketService.getChatSocket();
      if (chatSocket) {
        // Always attach listeners immediately (covers already-connected case)
        setupSocketListeners();
        // Also re-attach on reconnect
        chatSocket.on('connect', () => {
          setupSocketListeners();
          // Reload conversations on reconnect to stay in sync
          loadConversations();
        });
      }

      return () => {
        const socket = socketService.getChatSocket();
        if (socket) {
          socket.off('message:new');
          socket.off('user:online');
          socket.off('user:offline');
          socket.off('users:online');
          socket.off('typing:start');
          socket.off('typing:stop');
          socket.off('connect');
        }
      };
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">
          <div className="logo-icon logo-icon--lg">C</div>
          <h2>CoreChat</h2>
          <p>by Corework</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/', icon: HiOutlineChatBubbleLeftRight, label: 'Message' },
    { path: '/contacts', icon: HiOutlineUserGroup, label: 'Contacts' },
    { path: '/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <nav className={`app-nav ${isMobileMenuOpen ? 'app-nav--open' : ''}`}>
        <div className="app-nav__top">
          <div className="app-nav__logo" onClick={() => navigate('/')}>
            <div className="logo-icon">C</div>
          </div>
        </div>

        <div className="app-nav__items">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `app-nav__item ${isActive ? 'app-nav__item--active' : ''}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="app-nav__bottom">
          <Avatar
            src={user?.avatar}
            name={user?.name || 'U'}
            size="sm"
            onClick={() => navigate('/settings/profile')}
          />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
