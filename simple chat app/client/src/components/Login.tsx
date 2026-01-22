import React, { useState } from 'react';
import { User } from '../types';
import { createUser } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
  existingUsers: User[];
}

export function Login({ onLogin, existingUsers }: LoginProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const user = await createUser(username.trim(), email.trim()) as User;
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onLogin(user);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>💬 Chat App</h1>
        
        {existingUsers.length > 0 && (
          <div className="existing-users">
            <h3>Select existing user:</h3>
            <div className="user-list">
              {existingUsers.map(user => (
                <button
                  key={user.id}
                  className="user-button"
                  onClick={() => handleSelectUser(user)}
                >
                  {user.username}
                </button>
              ))}
            </div>
            <div className="divider">
              <span>or create new</span>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isCreating}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              disabled={isCreating}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create & Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
