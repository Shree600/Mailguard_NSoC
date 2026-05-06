import React from 'react';

const EmailCard = ({ email, onDelete, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-4 border rounded shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" role="img" aria-hidden="true"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const { id, from, subject, classification, confidence } = email;

  const getBadgeStyles = () => {
    if (classification === 'phishing') {
      return 'bg-red-100 text-red-800';
    }
    if (classification === 'safe') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 border rounded shadow bg-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600">{from || '—'}</p>
          <h3 className="text-lg font-bold">{subject || '—'}</h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getBadgeStyles()}`}>
          {classification || '—'}
        </span>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Confidence: {confidence ? `${(confidence * 100).toFixed(0)}%` : '—'}
        </span>
        <button
          onClick={() => onDelete && onDelete(id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
          aria-label="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default EmailCard;
