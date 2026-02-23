import { useState } from 'react';

export function useFormState(initial) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const submit = async (fn) => {
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await fn(values);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { values, set, error, setError, success, setSuccess, loading, submit };
}