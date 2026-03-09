import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineUserPlus,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatAPI, usersAPI } from '../../services/api';
import Avatar from '../../components/common/Avatar/Avatar';
import { Conversation, UserPublic } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './Chat.css';

const ChatListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    isLoadingConversations,
    onlineUsers,
    typingUsers,
    setActiveConversation,
  } = useChatStore();
  const [conversationSearch, setConversationSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!conversationSearch.trim()) return conversations;
    const q = conversationSearch.toLowerCase();
    return conversations.filter((conv) => {
      if (conv.type === 'group') {
        return conv.groupName?.toLowerCase().includes(q);
      }
      const other = conv.participants?.find((p) => p._id !== user?._id);
      return other?.name?.toLowerCase().includes(q);
    });
  }, [conversations, conversationSearch, user]);

  // New chat search (email / phone / username / name)
  useEffect(() => {
    if (!showNewChat) {
      setSearchResults([]);
      setNewChatQuery('');
      setIsSearching(false);
      return;
    }

    if (newChatQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await usersAPI.searchUsers(newChatQuery.trim());
        setSearchResults(data.data || data || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not search users');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [newChatQuery, showNewChat]);

  const getConversationName = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.groupName || 'Group';
    const other = conv.participants?.find((p) => p._id !== user?._id);
    return other?.name || other?.displayName || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.groupAvatar || '';
    const other = conv.participants?.find((p) => p._id !== user?._id);
    return other?.avatar || '';
  };

  const getOtherUserId = (conv: Conversation): string => {
    const other = conv.participants?.find((p) => p._id !== user?._id);
    return other?._id || '';
  };

  const isOnline = (conv: Conversation): boolean => {
    if (conv.type === 'group') return false;
    return onlineUsers.includes(getOtherUserId(conv));
  };

  const getTypingText = (conv: Conversation): string | null => {
    const typing = typingUsers[conv._id];
    if (!typing || typing.length === 0) return null;
    if (conv.type === 'group') {
      return `${typing.length} typing...`;
    }
    return 'typing...';
  };

  const getLastMessagePreview = (conv: Conversation): string => {
    if (!conv.lastMessage) return 'No messages yet';
    const msg = conv.lastMessage;
    if (msg.isDeleted) return 'This message was deleted';
    switch (msg.type) {
      case 'image': return '📷 Photo';
      case 'video': return '🎥 Video';
      case 'audio': return '🎵 Audio';
      case 'file': return `📎 ${msg.fileName || 'File'}`;
      case 'voice_note': return '🎤 Voice note';
      default: return msg.content || '';
    }
  };

  const getTimeLabel = (conv: Conversation): string => {
    const dateStr = conv.lastMessageAt || conv.createdAt;
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  const handleConversationClick = (conv: Conversation) => {
    setActiveConversation(conv);
    navigate(`/chat/${conv._id}`);
  };

  const handleSelectUser = async (selected: UserPublic) => {
    try {
      const { data } = await chatAPI.createConversation(selected._id);
      const conv = data.data || data;
      const conversationId = conv._id;
      if (conversationId) {
        setShowNewChat(false);
        setNewChatQuery('');
        setSearchResults([]);
        // Reload conversations so the new one appears in the list
        const { loadConversations } = useChatStore.getState();
        loadConversations();
        navigate(`/chat/${conversationId}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not start chat');
    }
  };

  return (
    <div className="chat-list-page">
      {/* Header */}
      <div className="chat-list__header">
        <h1 className="chat-list__title">Messages</h1>
        <div className="chat-list__header-actions">
          <button
            className="icon-btn"
            title="New Group"
          >
            <HiOutlineUserGroup size={20} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowNewChat(!showNewChat)}
            title="New Chat"
          >
            <HiOutlinePencilSquare size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="chat-list__search">
        <div className="search-input">
          <HiOutlineMagnifyingGlass className="search-input__icon" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={conversationSearch}
            onChange={(e) => setConversationSearch(e.target.value)}
            className="search-input__field"
          />
        </div>
      </div>

      {/* New Chat Overlay */}
      {showNewChat && (
        <div className="new-chat-bar">
          <HiOutlineUserPlus size={18} />
          <input
            type="text"
            placeholder="Search by name, email, phone, or username..."
            value={newChatQuery}
            onChange={(e) => setNewChatQuery(e.target.value)}
            className="new-chat-bar__input"
            autoFocus
          />

          <div className="new-chat-results">
            {isSearching && (
              <div className="new-chat-results__empty">
                <div className="spinner" />
                <span>Searching...</span>
              </div>
            )}

            {!isSearching && newChatQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="new-chat-results__empty">
                <span>No users found</span>
              </div>
            )}

            {!isSearching && searchResults.map((result) => (
              <button
                key={result._id}
                className="new-chat-results__item"
                onClick={() => handleSelectUser(result)}
              >
                <Avatar src={result.avatar} name={result.name || result.displayName || 'U'} size="sm" />
                <div className="new-chat-results__info">
                  <span className="new-chat-results__name">{result.displayName || result.name}</span>
                  <span className="new-chat-results__meta">
                    @{result.username}
                    {result.email ? ` • ${result.email}` : ''}
                    {result.phone ? ` • ${result.phone}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="chat-list__conversations">
        {isLoadingConversations ? (
          <div className="chat-list__empty">
            <div className="spinner" />
            <p>Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="chat-list__empty">
            <HiOutlinePencilSquare size={48} />
            <h3>No conversations yet</h3>
            <p>Start a new chat to begin messaging</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const typingText = getTypingText(conv);

            return (
              <div
                key={conv._id}
                className="conversation-item"
                onClick={() => handleConversationClick(conv)}
              >
                <Avatar
                  src={getConversationAvatar(conv)}
                  name={getConversationName(conv)}
                  size="md"
                  showStatus={conv.type === 'private'}
                  isOnline={isOnline(conv)}
                />

                <div className="conversation-item__content">
                  <div className="conversation-item__top">
                    <span className="conversation-item__name">
                      {getConversationName(conv)}
                    </span>
                    <span className="conversation-item__time">
                      {getTimeLabel(conv)}
                    </span>
                  </div>
                  <div className="conversation-item__bottom">
                    <span className={`conversation-item__preview ${typingText ? 'conversation-item__preview--typing' : ''}`}>
                      {typingText || getLastMessagePreview(conv)}
                    </span>
                    {(conv.unreadCount || 0) > 0 && (
                      <span className="conversation-item__badge">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatListPage;
