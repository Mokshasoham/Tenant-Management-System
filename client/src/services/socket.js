import { io } from 'socket.io-client';
import { resolveSocketUrl } from '../utils/envConfig.js';

let socketInstance = null;

/**
 * Returns a singleton Socket.IO client instance configured with the active auth token
 * and pointing to the production or local server.
 */
export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const socketUrl = resolveSocketUrl();

  socketInstance = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 15000,
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default getSocket;
