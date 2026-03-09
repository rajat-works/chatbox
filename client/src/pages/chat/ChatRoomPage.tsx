import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineMicrophone,
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineFaceSmile,
  HiOutlineEllipsisVertical,
  HiOutlineXMark,
  HiOutlineArrowUturnLeft,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatAPI } from '../../services/api';
import socketService from '../../services/socket';
import Avatar from '../../components/common/Avatar/Avatar';
import { Message, Conversation } from '../../types';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import SimplePeer, { Instance as SimplePeerInstance } from 'simple-peer';
import './Chat.css';

const ChatRoomPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    isLoadingMessages,
    loadMessages,
    addMessage,
    setActiveConversation,
    onlineUsers,
    typingUsers,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Call state =====
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [callIncoming, setCallIncoming] = useState(false);
  const [callIncomingData, setCallIncomingData] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<SimplePeerInstance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<any[]>([]);
  const sentOfferRef = useRef(false);
  const sentAnswerRef = useRef(false);

  // Load conversation data
  useEffect(() => {
    console.log('start Active conversation:',conversationId, activeConversation);
    if (conversationId) {
      if (!activeConversation || activeConversation._id !== conversationId) {
        // Load conversation from API
        chatAPI.getConversation(conversationId).then(({ data }) => {
          const conv = data.data || data;
          setActiveConversation(conv);
          console.log('Loaded conversation:', conversationId, conv);
        }).catch(() => {
          toast.error('Conversation not found');
          navigate('/');
        });
      }
      loadMessages(conversationId);
    }

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId]);

  // ===== Call logic =====
  const cleanupCall = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;
    pendingSignalsRef.current = [];
    sentOfferRef.current = false;
    sentAnswerRef.current = false;
    setCallActive(false);
    setCallType(null);
    setCallIncoming(false);
    setCallIncomingData(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const startCall = useCallback(async (type: 'voice' | 'video') => {
    const otherUserId = getOtherUserId();
    if (!otherUserId) return;
    sentOfferRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
     console.log('Created peer, waiting for signal...');

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      console.log('Got local media stream, initiating call...');
      setCallActive(true);
      setCallType(type);

      console.log('Created peer, waiting for signal s...');
      
  const peer = new SimplePeer({ 
    initiator: true, 
    trickle: false, 
    stream,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] }
  } as any);
      peerRef.current = peer;
      console.log('Created peer, waiting for signal ss...');
      peer.on('signal', (data: any) => {
        console.log('Sending signal data:', data);
        if (data.type === 'offer') {
          if (sentOfferRef.current) return;
          sentOfferRef.current = true;
          socketService.initiateCall(otherUserId, type, data);
        } else {
          socketService.sendIceCandidate(otherUserId, data);
        }
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('close', cleanupCall);
      peer.on('error', () => {
        toast.error('Call connection failed');
        cleanupCall();
      });
    } catch (error) {
        console.log('Error accessing media devices', error);
      toast.error('Could not access camera/microphone');
    }
  }, [activeConversation, cleanupCall]);

  const answerCall = useCallback(async () => {
    if (!callIncomingData) return;
    sentAnswerRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callIncomingData.type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      setCallActive(true);
      setCallType(callIncomingData.type);
      setCallIncoming(false);

  const peer = new SimplePeer({ 
    initiator: false, 
    trickle: false, 
    stream,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] }
  } as any);
      peerRef.current = peer;

      peer.on('signal', (data: any) => {
        if (data.type === 'answer') {
          if (sentAnswerRef.current) return;
          sentAnswerRef.current = true;
          socketService.answerCall(callIncomingData.callerId, data);
        } else {
          socketService.sendIceCandidate(callIncomingData.callerId, data);
        }
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('close', cleanupCall);
      peer.on('error', () => {
        toast.error('Call connection failed');
        cleanupCall();
      });

      peer.signal(callIncomingData.offer);
      if (pendingSignalsRef.current.length > 0) {
        pendingSignalsRef.current.forEach((signal) => peer.signal(signal));
        pendingSignalsRef.current = [];
      }
    } catch {
      toast.error('Could not access camera/microphone');
    }
  }, [callIncomingData, cleanupCall]);

  const endCall = useCallback(() => {
    const otherUserId = getOtherUserId();
    if (otherUserId) socketService.endCall(otherUserId);
    cleanupCall();
  }, [activeConversation, cleanupCall]);

  const rejectIncomingCall = useCallback(() => {
    if (callIncomingData?.callerId) {
      socketService.rejectCall(callIncomingData.callerId);
    }
    setCallIncoming(false);
    setCallIncomingData(null);
  }, [callIncomingData]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }, []);

  // Attach streams to video elements when refs become available
  useEffect(() => {
    if (callActive) {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    }
  }, [callActive, callType, localStreamRef.current, remoteStreamRef.current]);

  // Listen for call socket events
  useEffect(() => {
    const callsSocket = socketService.getCallsSocket();
    if (!callsSocket) return;

    const onIncoming = (data: any) => {
      setCallIncoming(true);
      setCallIncomingData(data);

      // Browser notification for incoming call when tab is not focused
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const callerName = data.callerName || 'Someone';
        try {
          new Notification(`Incoming ${data.type || ''} call`, {
            body: `${callerName} is calling you…`,
            icon: '/favicon.svg',
            tag: 'incoming-call',
            requireInteraction: true,
          });
        } catch {
          // Notification API not available
        }
      }
    };

    const onAnswered = (data: any) => {
      if (peerRef.current) {
        peerRef.current.signal(data.answer);
      }
    };

    const onIceCandidate = (data: any) => {
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      } else if (data.candidate) {
        pendingSignalsRef.current.push(data.candidate);
      }
    };

    const onEnded = () => cleanupCall();
    const onRejected = () => {
      toast('Call was rejected');
      cleanupCall();
    };

    callsSocket.on('call:incoming', onIncoming);
    callsSocket.on('call:answered', onAnswered);
    callsSocket.on('call:ice-candidate', onIceCandidate);
    callsSocket.on('call:ended', onEnded);
    callsSocket.on('call:rejected', onRejected);

    return () => {
      callsSocket.off('call:incoming', onIncoming);
      callsSocket.off('call:answered', onAnswered);
      callsSocket.off('call:ice-candidate', onIceCandidate);
      callsSocket.off('call:ended', onEnded);
      callsSocket.off('call:rejected', onRejected);
    };
  }, [cleanupCall]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conversation helpers
  const getConversationName = (): string => {
    console.log('Active conversation:', activeConversation);
    if (!activeConversation) return '';
    if (activeConversation.type === 'group') return activeConversation.groupName || 'Group';
    const other = activeConversation.participants?.find((p) => p._id !== user?._id);
    return other?.name || other?.displayName || 'Unknown';
  };

  const getConversationAvatar = (): string => {
    if (!activeConversation) return '';
    if (activeConversation.type === 'group') return activeConversation.groupAvatar || '';
    const other = activeConversation.participants?.find((p) => p._id !== user?._id);
    return other?.avatar || '';
  };

  const getOtherUserId = (): string => {
    if (!activeConversation || activeConversation.type === 'group') return '';
    const other = activeConversation.participants?.find((p) => p._id !== user?._id);
    return other?._id || '';
  };

  const isUserOnline = (): boolean => {
    const otherUserId = getOtherUserId();
    return otherUserId ? onlineUsers.includes(otherUserId) : false;
  };

  const getStatusText = (): string => {
    if (!activeConversation) return '';
    const typing = typingUsers[activeConversation._id];
    if (typing && typing.length > 0) {
      return activeConversation.type === 'group' ? `${typing.length} typing...` : 'typing...';
    }
    if (activeConversation.type === 'group') {
      return `${activeConversation.participants?.length || 0} members`;
    }
    return isUserOnline() ? 'Online' : 'Offline';
  };

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !conversationId) return;

    const messageText = inputText.trim();
    setInputText('');
    setReplyTo(null);
    setShowEmojiPicker(false);

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      socketService.stopTyping(conversationId);
    }

    try {
      // Send via socket for real-time delivery
      socketService.sendMessage(
        conversationId,
        messageText,
        'text',
        replyTo?._id,
      );
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  // Typing indicator
  const handleTyping = () => {
    if (!conversationId) return;
    socketService.startTyping(conversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversationId);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // File handlers
  const handleFileUpload = async (file: File, type: string) => {
    if (!conversationId) return;
    setShowAttachMenu(false);
    try {
      await chatAPI.sendFileMessage(conversationId, file, type);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send file');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'image');
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'file');
    e.target.value = '';
  };

  // Load more messages on scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && !isLoadingMessages && conversationId) {
      setPage((p) => {
        const next = p + 1;
        loadMessages(conversationId, next);
        return next;
      });
    }
  }, [isLoadingMessages, conversationId]);

  // Date separator helper
  const formatDateSeparator = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDateSeparator = (idx: number): boolean => {
    if (idx === 0) return true;
    const curr = new Date(messages[idx].createdAt).toDateString();
    const prev = new Date(messages[idx - 1].createdAt).toDateString();
    return curr !== prev;
  };

  // Message status icon
  const renderStatus = (msg: Message) => {
    if (msg.sender._id !== user?._id) return null;
    switch (msg.status) {
      case 'read':
        return <HiOutlineCheckCircle className="msg-status msg-status--read" size={14} />;
      case 'delivered':
        return <HiOutlineCheckCircle className="msg-status msg-status--delivered" size={14} />;
      default:
        return <HiOutlineCheckCircle className="msg-status" size={14} />;
    }
  };

  // Render file message content
  const renderMessageContent = (msg: Message) => {
    if (msg.isDeleted) {
      return <span className="msg-deleted">This message was deleted</span>;
    }
    switch (msg.type) {
      case 'image':
        return (
          <div className="msg-image">
            <img src={msg.fileUrl} alt="Shared image" loading="lazy" />
            {msg.content && <p className="msg-image__caption">{msg.content}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="msg-video">
            <video src={msg.fileUrl} controls preload="metadata" />
            {msg.content && <p className="msg-video__caption">{msg.content}</p>}
          </div>
        );
      case 'file':
        return (
          <a className="msg-file" href={msg.fileUrl} target="_blank" rel="noreferrer">
            <HiOutlinePaperClip size={18} />
            <div className="msg-file__info">
              <span className="msg-file__name">{msg.fileName || 'File'}</span>
              {msg.fileSize && (
                <span className="msg-file__size">
                  {(msg.fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </a>
        );
      case 'voice_note':
        return (
          <div className="msg-voice">
            <HiOutlineMicrophone size={18} />
            <audio src={msg.fileUrl} controls preload="metadata" />
          </div>
        );
      case 'system':
        return <span className="msg-system">{msg.content}</span>;
      default:
        return <p className="msg-text">{msg.content}</p>;
    }
  };

  return (
    <div className="chat-room-page">
      {/* Chat Header */}
      <div className="chat-room__header">
        <button className="icon-btn chat-room__back" onClick={() => navigate('/')}>
          <HiOutlineArrowLeft size={22} />
        </button>

        <Avatar
          src={getConversationAvatar()}
          name={getConversationName()}
          size="sm"
          showStatus={activeConversation?.type === 'private'}
          isOnline={isUserOnline()}
        />

        <div className="chat-room__header-info">
          <h3 className="chat-room__header-name">{getConversationName()}</h3>
          <span className={`chat-room__header-status ${isUserOnline() ? 'chat-room__header-status--online' : ''}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="chat-room__header-actions">
          {activeConversation?.type === 'private' && (
            <>
              <button className="icon-btn" title="Voice call" onClick={() => startCall('voice')}>
                <HiOutlinePhone size={20} />
              </button>
              <button className="icon-btn" title="Video call" onClick={() => startCall('video')}>
                <HiOutlineVideoCamera size={20} />
              </button>
            </>
          )}
          <button className="icon-btn" title="More">
            <HiOutlineEllipsisVertical size={20} />
          </button>
        </div>
      </div>

      {/* Incoming call banner */}
      {callIncoming && !callActive && (
        <div className="call-incoming-banner">
          <span className="call-incoming-banner__text">
            <HiOutlinePhone size={18} />
            Incoming {callIncomingData?.type || ''} call…
          </span>
          <button className="btn btn--primary btn--sm" onClick={answerCall}>Accept</button>
          <button className="btn btn--danger btn--sm" onClick={rejectIncomingCall}>Reject</button>
        </div>
      )}

      {/* Active call overlay */}
      {callActive && (
        <div className="call-overlay">
          <div className="call-overlay__videos">
            {callType === 'video' && (
              <>
                <video ref={remoteVideoRef} className="call-overlay__remote-video" autoPlay playsInline />
                <video ref={localVideoRef} className="call-overlay__local-video" autoPlay playsInline muted />
              </>
            )}
            {callType === 'voice' && (
              <div className="call-overlay__voice-indicator">
                <Avatar src={getConversationAvatar()} name={getConversationName()} size="xl" />
                <p>{getConversationName()}</p>
                <span className="call-overlay__voice-label">Voice call in progress…</span>
                {/* hidden elements so streams attach */}
                <audio ref={remoteVideoRef as any} autoPlay />
                <audio ref={localVideoRef as any} autoPlay muted />
              </div>
            )}
          </div>
          <div className="call-overlay__controls">
            <button className={`icon-btn icon-btn--call ${isMuted ? 'icon-btn--active' : ''}`} onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
              <HiOutlineMicrophone size={22} />
            </button>
            {callType === 'video' && (
              <button className={`icon-btn icon-btn--call ${isVideoOff ? 'icon-btn--active' : ''}`} onClick={toggleVideo} title={isVideoOff ? 'Turn video on' : 'Turn video off'}>
                <HiOutlineVideoCamera size={22} />
              </button>
            )}
            <button className="icon-btn icon-btn--end-call" onClick={endCall} title="End call">
              <HiOutlinePhone size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        className="chat-room__messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {isLoadingMessages && page === 1 && (
          <div className="chat-room__loading">
            <div className="spinner" />
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender._id === user?._id;
          const showDate = shouldShowDateSeparator(idx);

          return (
            <React.Fragment key={msg._id}>
              {showDate && (
                <div className="date-separator">
                  <span>{formatDateSeparator(msg.createdAt)}</span>
                </div>
              )}

              {msg.type === 'system' ? (
                <div className="system-message">
                  <span>{msg.content}</span>
                </div>
              ) : (
                <div className={`message ${isMine ? 'message--mine' : 'message--theirs'}`}>
                  {!isMine && activeConversation?.type === 'group' && (
                    <span className="message__sender-name">{msg.sender.name}</span>
                  )}

                  {msg.replyTo && (
                    <div className="message__reply">
                      <span className="message__reply-name">{msg.replyTo.sender.name}</span>
                      <span className="message__reply-text">
                        {msg.replyTo.content || `[${msg.replyTo.type}]`}
                      </span>
                    </div>
                  )}

                  <div className="message__bubble">
                    {renderMessageContent(msg)}
                    <div className="message__meta">
                      <span className="message__time">
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                      {renderStatus(msg)}
                    </div>
                  </div>

                  <div className="message__actions">
                    <button
                      className="message__action-btn"
                      onClick={() => setReplyTo(msg)}
                      title="Reply"
                    >
                      <HiOutlineArrowUturnLeft size={14} />
                    </button>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div className="chat-room__reply-bar">
          <div className="reply-bar__content">
            <span className="reply-bar__name">{replyTo.sender.name}</span>
            <span className="reply-bar__text">
              {replyTo.content || `[${replyTo.type}]`}
            </span>
          </div>
          <button className="icon-btn" onClick={() => setReplyTo(null)}>
            <HiOutlineXMark size={18} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="chat-room__input-bar">
        {/* Attachment menu */}
        <div className="input-bar__attach">
          <button
            className="icon-btn"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
          >
            <HiOutlinePaperClip size={20} />
          </button>
          {showAttachMenu && (
            <div className="attach-menu">
              <button
                className="attach-menu__item"
                onClick={() => imageInputRef.current?.click()}
              >
                <HiOutlinePhoto size={20} />
                <span>Photo</span>
              </button>
              <button
                className="attach-menu__item"
                onClick={() => fileInputRef.current?.click()}
              >
                <HiOutlinePaperClip size={20} />
                <span>File</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileSelect}
        />

        <button
          className="icon-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <HiOutlineFaceSmile size={20} />
        </button>

        <div className="input-bar__text-wrapper">
          <input
            type="text"
            className="input-bar__text"
            placeholder="Write your message..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {inputText.trim() ? (
          <button className="icon-btn icon-btn--primary" onClick={handleSend}>
            <HiOutlinePaperAirplane size={20} />
          </button>
        ) : (
          <button className="icon-btn">
            <HiOutlineMicrophone size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatRoomPage;
