import { useState, useEffect } from 'react';
import { getEmails } from '../services/api';

export const useEmails = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setLoading(true);
        const data = await getEmails();
        setEmails(data.emails || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch emails');
        setEmails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  return { emails, loading, error };
};
