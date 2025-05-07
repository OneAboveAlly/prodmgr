import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, MoreVertical, Paperclip, Camera, X } from 'lucide-react';
import clsx from 'clsx';
import api from '@/services/api.service';

// Pobierz adres bazowy API z konfiguracji
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Wyciągnij adres serwera bez /api (dla plików statycznych)
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const ChatBox = ({ selectedUser }) => {
  const { user } = useAuth();
  const { messages, sendMessage, fetchMessagesForUser, deleteMessage, markMessagesAsRead } = useChat();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fetchedRef = useRef(false);
  const fileInputRef = useRef(null);
  
  // State for file attachment
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Stan do kontrolowania auto-scrollowania
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  // Pobieranie wiadomości tylko raz przy pierwszym renderowaniu dla danego użytkownika
  useEffect(() => {
    if (!selectedUser?.id) return;
    
    // Reset flagi przy zmianie użytkownika
    fetchedRef.current = false;
    
    const loadMessages = async () => {
      // Jeśli już pobraliśmy wiadomości dla tego użytkownika, nie pobieraj ponownie
      if (fetchedRef.current) return;
      
      setIsLoading(true);
      await fetchMessagesForUser(selectedUser.id);
      setIsLoading(false);
      
      // Ustaw flagę, że pobrano wiadomości
      fetchedRef.current = true;
      
      // Resetuj flagę przewijania po załadowaniu nowych wiadomości
      setShouldScrollToBottom(true);
    };
    
    loadMessages();
  }, [selectedUser?.id, fetchMessagesForUser]);

  // Zoptymalizowana funkcja sprawdzania scrollowania
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Jeśli użytkownik jest blisko dołu (w odległości 50px), to przewijaj automatycznie
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldScrollToBottom(isNearBottom);
  }, []);

  // Dodajemy event listener tylko raz
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Memoizujemy currentMessages, aby nie tworzyć nowej tablicy przy każdym renderze
  const currentMessages = messages[selectedUser?.id] || [];

  // Przewijanie do najnowszej wiadomości, ale tylko jeśli jesteśmy na dole
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current && currentMessages.length > 0) {
      // Używamy setTimeout, aby przewijanie nastąpiło po renderze wiadomości
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentMessages.length, shouldScrollToBottom]);

  // Oznaczamy wiadomości jako przeczytane, gdy są widoczne
  useEffect(() => {
    if (selectedUser?.id && currentMessages.length > 0) {
      // Znajdujemy nieprzeczytane wiadomości od wybranego użytkownika
      const hasUnreadMessages = currentMessages.some(
        msg => msg.senderId === selectedUser.id && !msg.isRead
      );
      
      // Jeśli są nieprzeczytane wiadomości, oznaczamy je jako przeczytane
      if (hasUnreadMessages) {
        markMessagesAsRead(selectedUser.id);
      }
    }
  }, [currentMessages, selectedUser, markMessagesAsRead]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, just show the filename
      setFilePreview('');
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !selectedUser?.id) return;
    
    // Po wysłaniu wiadomości zawsze przewijaj do dołu
    setShouldScrollToBottom(true);
    
    if (selectedFile) {
      setIsUploading(true);
      try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('content', message);
        
        // Send the file and message content using the configured api service
        await api.post(`/chat/${selectedUser.id}/attachment`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Clear file and message after sending
        clearSelectedFile();
        setMessage('');
      } catch (error) {
        console.error('Error sending message with attachment:', error);
        alert('Nie udało się wysłać załącznika. Spróbuj ponownie.');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Send text-only message
      await sendMessage(selectedUser.id, message);
      setMessage('');
    }
  };
  
  // Helper function to get file icon or preview
  const getFileDisplay = (attachment) => {
    const fileType = attachment.fileType || '';
    
    // Konstruujemy pełny URL do pliku uwzględniając adres serwera
    const fileUrl = `${SERVER_BASE_URL}${attachment.filePath}`;
    
    if (fileType.startsWith('image/')) {
      return (
        <img 
          src={fileUrl} 
          alt="Attachment" 
          className="max-w-full max-h-48 rounded-md cursor-pointer" 
          onClick={() => window.open(fileUrl, '_blank')}
        />
      );
    }
    
    // For non-image files
    return (
      <div 
        className="flex items-center gap-2 p-2 bg-gray-200 rounded-md cursor-pointer"
        onClick={() => window.open(fileUrl, '_blank')}
      >
        <Paperclip size={16} />
        <span className="text-xs truncate max-w-[150px]">{attachment.fileName}</span>
      </div>
    );
  };
  
  // Obsługa usuwania wiadomości
  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę wiadomość?')) {
      await deleteMessage(messageId);
      setSelectedMessageId(null);
    }
  };

  // Open camera function
  const openCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        // Create modal for camera
        const modalContainer = document.createElement('div');
        modalContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white p-4 rounded-lg shadow-lg flex flex-col items-center';
        
        const videoElement = document.createElement('video');
        videoElement.className = 'mb-4 rounded';
        videoElement.style.width = '100%';
        videoElement.style.maxWidth = '400px';
        videoElement.style.height = 'auto';
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex space-x-4';
        
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Zrób zdjęcie';
        captureButton.className = 'px-4 py-2 bg-indigo-600 text-white rounded-lg';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Anuluj';
        cancelButton.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg';
        
        buttonContainer.appendChild(captureButton);
        buttonContainer.appendChild(cancelButton);
        
        modalContent.appendChild(videoElement);
        modalContent.appendChild(buttonContainer);
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        const closeModal = () => {
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(modalContainer);
        };
        
        captureButton.onclick = () => {
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setFilePreview(canvas.toDataURL('image/jpeg'));
            closeModal();
          }, 'image/jpeg');
        };
        
        cancelButton.onclick = closeModal;
      })
      .catch((error) => {
        console.error('Error accessing camera:', error);
        alert('Nie można uzyskać dostępu do kamery. Sprawdź uprawnienia.');
      });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 text-sm">Ładowanie wiadomości...</p>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 text-sm">Brak wiadomości. Rozpocznij konwersację!</p>
          </div>
        ) : (
          <>
            {currentMessages.map((msg) => (
              <div
                key={msg.id || `${msg.senderId}-${msg.createdAt}`}
                className={clsx(
                  'group relative max-w-[80%] p-2 rounded-lg text-sm shadow-sm',
                  msg.senderId === user?.id
                    ? 'ml-auto bg-indigo-100'
                    : 'mr-auto bg-gray-100',
                  msg.isDeleted && 'opacity-70',
                  // Dodajemy pogrubienie dla nieprzeczytanych wiadomości
                  msg.senderId !== user?.id && !msg.isRead && !msg.isDeleted && 'font-semibold border-l-4 border-indigo-500'
                )}
                onMouseEnter={() => msg.senderId === user?.id && setSelectedMessageId(msg.id)}
                onMouseLeave={() => setSelectedMessageId(null)}
              >
                {/* Wyświetlanie imienia i nazwiska nadawcy dla wiadomości od innych użytkowników */}
                {msg.senderId !== user?.id && !msg.isDeleted && (
                  <div className="text-xs font-semibold text-indigo-600 mb-1">
                    {msg.sender?.firstName} {msg.sender?.lastName}
                  </div>
                )}
                
                {/* Treść wiadomości */}
                <div className={clsx(msg.isDeleted && 'italic text-gray-500')}>
                  {msg.isDeleted 
                    ? "Wiadomość została usunięta" 
                    : msg.content
                  }
                </div>
                
                {/* File attachment */}
                {!msg.isDeleted && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2">
                    {msg.attachments.map(attachment => (
                      <div key={attachment.id} className="mt-1">
                        {getFileDisplay(attachment)}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Przycisk usuwania - widoczny tylko dla własnych wiadomości po najechaniu */}
                {msg.senderId === user?.id && selectedMessageId === msg.id && !msg.isDeleted && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-90 hover:opacity-100"
                    title="Usuń wiadomość"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                
                <div className="flex items-center justify-end mt-1 space-x-2">
                  {/* Status odczytania - tylko dla własnych wiadomości */}
                  {msg.senderId === user?.id && !msg.isDeleted && (
                    <span className="text-[10px] text-gray-500" title={msg.isRead ? "Odczytano" : "Wysłano"}>
                      {msg.isRead ? "✓✓" : "✓"}
                    </span>
                  )}
                  
                  {/* Czas wysłania wiadomości */}
                  <div className="text-[10px] text-gray-500 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* File preview area */}
      {selectedFile && (
        <div className="px-2 pt-2">
          <div className="flex items-center p-2 bg-gray-100 rounded-lg">
            <div className="flex-1 flex items-center">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded" />
              ) : (
                <div className="flex items-center">
                  <Paperclip size={16} className="mr-2" />
                  <span className="text-xs truncate max-w-[200px]">{selectedFile.name}</span>
                </div>
              )}
            </div>
            <button
              onClick={clearSelectedFile}
              className="p-1 hover:bg-gray-200 rounded-full"
              title="Usuń załącznik"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <div className="p-2 border-t flex items-center gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Napisz wiadomość..."
          className="flex-1 border rounded-lg px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500"
          disabled={isUploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
          title="Dodaj załącznik"
          disabled={isUploading}
        >
          <Paperclip size={18} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain"
        />
        <button
          onClick={openCamera}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
          title="Zrób zdjęcie"
          disabled={isUploading}
        >
          <Camera size={18} />
        </button>
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || isUploading}
          className={`px-3 py-1 rounded-lg text-xs ${(!message.trim() && !selectedFile) || isUploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {isUploading ? 'Wysyłanie...' : 'Wyślij'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
