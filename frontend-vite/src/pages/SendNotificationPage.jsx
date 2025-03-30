import { useState } from 'react';
import api from '@/services/api.service'; // ✅ używamy instancji z baseURL i interceptorami

const SendNotificationPage = () => {
  const [userId, setUserId] = useState('');
  const [content, setContent] = useState('');

  const sendNotification = async () => {
    try {
      const res = await api.post('/notifications/send', {
        userId,
        content,
        link: '/dashboard', // możesz dodać jakikolwiek link
      });
      console.log('✅ Wysłano:', res.data);
      alert('✅ Powiadomienie wysłane!');
    } catch (err) {
      console.error('❌ Błąd:', err.response?.data || err.message);
      alert('❌ Błąd przy wysyłaniu powiadomienia');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Testowe wysyłanie powiadomień</h2>
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="User ID"
        className="border p-2 mb-4 w-full"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Treść powiadomienia"
        className="border p-2 mb-4 w-full"
      />
      <button
        onClick={sendNotification}
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        Wyślij powiadomienie
      </button>
    </div>
  );
};

export default SendNotificationPage;
