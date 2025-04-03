import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';
import Textarea from '../../components/common/Textarea';
import Input from '../../components/common/Input';
import productionApi from '../../api/production.api';

const CommentSection = ({ stepId, guideId }) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState([]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['comments', stepId],
    queryFn: () => productionApi.getStepComments(stepId),
    select: (data) => data.comments || [],
    onError: (err) => {
      console.error('Error fetching comments:', err);
    }
  });

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('content', newComment);
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((file) => formData.append('attachments', file));
      }

      return productionApi.addStepComment(stepId, formData);
    },
    onSuccess: () => {
      toast.success('Komentarz dodany');
      queryClient.invalidateQueries({ queryKey: ['comments', stepId] });
      setNewComment('');
      setAttachments([]);
    },
    onError: (err) => {
      console.error('Error adding comment:', err);
      toast.error(err?.response?.data?.message || 'Błąd dodawania komentarza');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Proszę wpisać treść komentarza');
      return;
    }
    mutation.mutate();
  };

  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  if (isLoading) return <Spinner label="Ładowanie komentarzy..." />;
  
  if (isError) return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <h4 className="font-semibold text-lg text-gray-800">💬 Komentarze</h4>
      <p className="text-red-600">Błąd: {error?.message || 'Nie można pobrać komentarzy'}</p>
    </div>
  );

  const comments = data || [];

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <h4 className="font-semibold text-lg text-gray-800">💬 Komentarze</h4>

      {comments.length === 0 && (
        <p className="text-sm text-gray-500 italic">Brak komentarzy.</p>
      )}

      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="border-b pb-2">
            <p className="text-sm text-gray-800">{comment.content}</p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {comment.user.firstName} {comment.user.lastName}
              </p>
              {comment.attachments && comment.attachments.length > 0 && (
                <span className="text-xs text-indigo-500">
                  {comment.attachments.length} załącznik(ów)
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          label="Dodaj komentarz"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Załączniki (opcjonalnie)
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          {attachments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Wybrano {attachments.length} {attachments.length === 1 ? 'plik' : 'plików'}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            disabled={mutation.isLoading || !newComment.trim()}
          >
            {mutation.isLoading ? 'Wysyłanie...' : 'Dodaj komentarz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;