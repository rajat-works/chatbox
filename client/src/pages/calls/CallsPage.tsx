import React, { useState } from 'react';
import {
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlinePhoneXMark,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import Avatar from '../../components/common/Avatar/Avatar';
import './Calls.css';

interface CallRecord {
  id: string;
  name: string;
  avatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  time: string;
  duration?: string;
}

// Placeholder data – will be replaced by API data later
const mockCalls: CallRecord[] = [
  { id: '1', name: 'Alex Morgan', avatar: '', type: 'voice', direction: 'outgoing', time: 'Today, 10:30 AM', duration: '05:23' },
  { id: '2', name: 'Sarah Chen', avatar: '', type: 'video', direction: 'incoming', time: 'Today, 09:15 AM', duration: '12:47' },
  { id: '3', name: 'Design Team', avatar: '', type: 'voice', direction: 'missed', time: 'Yesterday, 4:00 PM' },
  { id: '4', name: 'Mike Johnson', avatar: '', type: 'video', direction: 'outgoing', time: 'Yesterday, 2:30 PM', duration: '03:11' },
  { id: '5', name: 'Emma Wilson', avatar: '', type: 'voice', direction: 'incoming', time: 'Dec 20, 11:00 AM', duration: '08:55' },
];

const CallsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCalls = mockCalls.filter((call) => {
    if (filter === 'missed' && call.direction !== 'missed') return false;
    if (searchQuery) {
      return call.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getDirectionIcon = (call: CallRecord) => {
    switch (call.direction) {
      case 'outgoing':
        return <HiOutlineArrowUpRight className="call-direction call-direction--outgoing" size={14} />;
      case 'missed':
        return <HiOutlinePhoneXMark className="call-direction call-direction--missed" size={14} />;
      default:
        return <HiOutlineArrowDownLeft className="call-direction call-direction--incoming" size={14} />;
    }
  };

  return (
    <div className="calls-page">
      <div className="calls__header">
        <h1 className="calls__title">Calls</h1>
      </div>

      {/* Search */}
      <div className="calls__search">
        <div className="search-input">
          <HiOutlineMagnifyingGlass className="search-input__icon" size={18} />
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input__field"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="calls__tabs">
        <button
          className={`calls__tab ${filter === 'all' ? 'calls__tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`calls__tab ${filter === 'missed' ? 'calls__tab--active' : ''}`}
          onClick={() => setFilter('missed')}
        >
          Missed
        </button>
      </div>

      {/* Call History */}
      <div className="calls__list">
        {filteredCalls.length === 0 ? (
          <div className="calls__empty">
            <HiOutlinePhone size={48} />
            <h3>No calls</h3>
            <p>Your call history will appear here</p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div key={call.id} className="call-item">
              <Avatar src={call.avatar} name={call.name} size="md" />

              <div className="call-item__content">
                <span className={`call-item__name ${call.direction === 'missed' ? 'call-item__name--missed' : ''}`}>
                  {call.name}
                </span>
                <div className="call-item__meta">
                  {getDirectionIcon(call)}
                  <span className="call-item__time">{call.time}</span>
                  {call.duration && (
                    <span className="call-item__duration"> · {call.duration}</span>
                  )}
                </div>
              </div>

              <button className="icon-btn" title={call.type === 'video' ? 'Video call' : 'Voice call'}>
                {call.type === 'video' ? (
                  <HiOutlineVideoCamera size={20} />
                ) : (
                  <HiOutlinePhone size={20} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CallsPage;
