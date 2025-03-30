import React, { useEffect, useRef, useState } from 'react';
import { socket } from '@/socket';
import api from '@/services/api.service';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

const ChatBox = ({ selectedUser }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedUser.id}`);
        setMessages(data);
      } catch (err) {
        console.error('Błąd pobierania wiadomości:', err);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    socket.on('message:receive', (newMsg) => {
      if (
        newMsg.senderId === selectedUser?.id ||
        newMsg.receiverId === selectedUser?.id
      ) {
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    return () => {
      socket.off('message:receive');
    };
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMsg = {
      content: message,
      senderId: user.id,
      receiverId: selectedUser.id,
    };

    socket.emit('message:send', newMsg);
    setMessages((prev) => [...prev, { ...newMsg, isRead: false }]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden">
      <div className="border-b p-4 font-semibold">
        {selectedUser.firstName} {selectedUser.lastName}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[70%] p-3 rounded-xl text-sm shadow-sm',
              msg.senderId === user.id
                ? 'ml-auto bg-indigo-100'
                : 'mr-auto bg-gray-100'
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex items-center gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Napisz wiadomość..."
          className="flex-1 border rounded-xl px-4 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700"
        >
          Wyślij
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
