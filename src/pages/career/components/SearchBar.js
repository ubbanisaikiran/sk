import React, { useState } from 'react';

const FILTERS = ['All', 'Full-time', 'Part-time', 'Remote', 'Internship'];

export default function SearchBar({ value, onChange }) {
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState('All');

  const handleFilter = (f) => {
    setFilter(f);
    setShowFilter(false);
    onChange(value, f);
  };

  return (
    <div className="career-search">
      <div className="career-search__input-wrap">
        <span className="career-search__icon">🔍</span>
        <input
          className="career-search__input"
          type="text"
          placeholder="Search jobs, companies, locations..."
          value={value}
          onChange={e => onChange(e.target.value, filter)}
        />
      </div>

      <button className="career-btn career-btn--primary career-search__btn">
        Search
      </button>

      <div className="career-search__filter-wrap">
        <button
          className="career-btn career-btn--outline"
          onClick={() => setShowFilter(!showFilter)}
        >
          ⚙ Filter {filter !== 'All' && `(${filter})`}
        </button>

        {showFilter && (
          <div className="career-search__dropdown">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`career-search__dropdown-item ${filter === f ? 'active' : ''}`}
                onClick={() => handleFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}