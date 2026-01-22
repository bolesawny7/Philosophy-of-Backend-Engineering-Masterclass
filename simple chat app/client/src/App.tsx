import { useState, useEffect, useCallback } from 'react';
import { Login } from './components/Login';
import { RoomList } from './components/RoomList';
import { ChatRoom } from './components/ChatRoom';
import { User, Room } from './types';
import { getUsers, getRooms } from './services/api';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers() as User[];
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const data = await getRooms() as Room[];
      setRooms(data || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUsers(), loadRooms()]);
      setLoading(false);
    };
    init();
  }, [loadUsers, loadRooms]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    loadUsers(); // Refresh users list
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleBackToRooms = () => {
    setSelectedRoom(null);
    loadRooms(); // Refresh rooms
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} existingUsers={users} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>💬 Chat App</h1>
        <div className="user-info">
          <span>Logged in as <strong>{currentUser.username}</strong></span>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {selectedRoom ? (
          <ChatRoom
            room={selectedRoom}
            currentUser={currentUser}
            onBack={handleBackToRooms}
          />
        ) : (
          <RoomList
            rooms={rooms}
            currentUser={currentUser}
            onSelectRoom={handleSelectRoom}
            onRoomCreated={loadRooms}
          />
        )}
      </main>
    </div>
  );
}

export default App;
