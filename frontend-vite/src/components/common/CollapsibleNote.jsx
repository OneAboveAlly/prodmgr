import React, { useState } from 'react';

const CollapsibleNote = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle empty text
  if (!text || text.trim() === '') {
    return <span className="text-gray-400">-</span>;
  }
  
  // Clean up the text - replace multiple spaces with single spaces
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Split into words, respecting special characters
  const words = cleanText.split(' ');
  
  // If 8 words or less, just show the full text
  if (words.length <= 8) {
    return <span className="text-gray-500">{cleanText}</span>;
  }
  
  // Get first 8 words
  const previewText = words.slice(0, 8).join(' ');
  
  return (
    <div className="text-gray-500">
      {isExpanded ? (
        <>
          {cleanText}
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Collapse
          </button>
        </>
      ) : (
        <>
          {previewText}...
          <button
            onClick={() => setIsExpanded(true)}
            className="ml-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Read more
          </button>
        </>
      )}
    </div>
  );
};

export default CollapsibleNote;
