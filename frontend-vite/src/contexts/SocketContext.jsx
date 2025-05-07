import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Create the Socket context
const SocketContext = createContext(null);

// URL for the WebSocket server - should match your backend socket server
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated, authToken } = useAuth();

  useEffect(() => {
    let socketInstance = null;

    // Only create a socket connection if the user is authenticated
    if (isAuthenticated && authToken) {
      console.log('Creating socket connection...');
      
      // Create a new socket instance with authentication token
      socketInstance = io(SOCKET_URL, {
        auth: {
          token: authToken
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Set up connection event handlers
      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);
        setIsConnected(true);
        
        // Identify user to the server
        socketInstance.emit('identify', {
          userId: user?.id,
          name: `${user?.firstName} ${user?.lastName}`
        });
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Store the socket instance in state
      setSocket(socketInstance);
    }

    // Cleanup function to disconnect socket when component unmounts
    // or when authentication state changes
    return () => {
      if (socketInstance) {
        console.log('Disconnecting socket...');
        socketInstance.disconnect();
        setIsConnected(false);
        setSocket(null);
      }
    };
  }, [isAuthenticated, authToken, user]);

  // Mock socket implementation for development when a real socket server isn't available
  useEffect(() => {
    // Skip if we have a real socket connection
    if (socket) return;
    
    // Create a mock socket implementation if no real socket is available
    // This is useful for development without a backend socket server
    if (isAuthenticated && !socket) {
      console.log('Creating mock socket for development...');
      const mockSocket = {
        id: 'mock-socket-id',
        connected: true,
        on: (event, callback) => {
          console.log(`[MOCK SOCKET] Registered handler for event: ${event}`);
          // Store event handlers in a closure
          if (!mockSocket.eventHandlers[event]) {
            mockSocket.eventHandlers[event] = [];
          }
          mockSocket.eventHandlers[event].push(callback);
        },
        off: (event) => {
          console.log(`[MOCK SOCKET] Removed handlers for event: ${event}`);
          delete mockSocket.eventHandlers[event];
        },
        emit: (event, data) => {
          console.log(`[MOCK SOCKET] Emitted event: ${event}`, data);
          // Handle specific events
          if (event === 'join-guide') {
            // Simulate sending active users after joining a guide
            setTimeout(() => {
              const mockUsers = [
                { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
                { id: '2', firstName: 'Anna', lastName: 'Nowak' }
              ];
              
              // Call any registered handlers for the activeUsers event
              if (mockSocket.eventHandlers[`guide:${data.guideId}:activeUsers`]) {
                mockSocket.eventHandlers[`guide:${data.guideId}:activeUsers`].forEach(handler => {
                  handler(mockUsers);
                });
              }
            }, 500);
          }
        },
        // Store event handlers
        eventHandlers: {}
      };
      
      setSocket(mockSocket);
      setIsConnected(true);
    }
  }, [isAuthenticated, socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for using the socket
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext; 