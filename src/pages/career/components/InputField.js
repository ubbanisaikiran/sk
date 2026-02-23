import React from 'react';

export default function InputField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="career-input-wrap">
      <label className="career-input-label">{label}</label>
      <input
        className="career-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}