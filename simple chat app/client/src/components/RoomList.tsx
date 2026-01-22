import React, { useState } from 'react';
import { Room, User } from '../types';
import { createRoom, joinRoom } from '../services/api';

interface RoomListProps {
  rooms: Room[];
  currentUser: User;
  onSelectRoom: (room: Room) => void;
  onRoomCreated: () => void;
}

export function RoomList({ rooms, currentUser, onSelectRoom, onRoomCreated }: RoomListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setIsCreating(true);
    try {
      await createRoom(roomName.trim(), roomDescription.trim(), currentUser.id);
      setRoomName('');
      setRoomDescription('');
      setShowCreate(false);
      onRoomCreated();
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (room: Room) => {
    const isMember = room.members?.some(m => m.id === currentUser.id);
    
    if (!isMember) {
      try {
        await joinRoom(room.id, currentUser.id);
      } catch (error) {
        console.error('Failed to join room:', error);
      }
    }
    
    onSelectRoom(room);
  };

  return (
    <div className="room-list">
      <div className="room-list-header">
        <h2>Rooms</h2>
        <button 
          className="icon-button"
          onClick={() => setShowCreate(!showCreate)}
          title="Create room"
        >
          +
        </button>
      </div>

      {showCreate && (
        <form className="create-room-form" onSubmit={handleCreateRoom}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name"
            disabled={isCreating}
          />
          <input
            type="text"
            value={roomDescription}
            onChange={(e) => setRoomDescription(e.target.value)}
            placeholder="Description (optional)"
            disabled={isCreating}
          />
          <button type="submit" disabled={isCreating || !roomName.trim()}>
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="rooms">
        {rooms.length === 0 ? (
          <p className="no-rooms">No rooms yet. Create one!</p>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              className="room-item"
              onClick={() => handleJoinRoom(room)}
            >
              <div className="room-name"># {room.name}</div>
              {room.description && (
                <div className="room-description">{room.description}</div>
              )}
              <div className="room-members">
                {room.members?.length || 0} members
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
