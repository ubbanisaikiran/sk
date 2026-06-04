import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { agriStackAPI } from './services/api';

const BATCH_SIZE = 10;
const HEADER_ALIASES = {
  aadhaarNumber: [
    'aadhaarnumber',
    'aadhaarno',
    'aadhaarno',
    'aadharnumber',
    'aadharno',
    'aadharno',
    'aadhaar',
  ],
  aadhaarName: [
    'aadhaarname',
    'aadharname',
    'name',
    'aadhaarholdername',
  ],
};

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getMappedValue(record, aliases) {
  for (const [key, value] of Object.entries(record)) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }
  return '';
}

function normalizeAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12) return digits.slice(0, 12);
  return digits.padStart(12, '0');
}

async function parseWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    aadhaarNumber: normalizeAadhaar(getMappedValue(row, HEADER_ALIASES.aadhaarNumber)),
    aadhaarName: String(getMappedValue(row, HEADER_ALIASES.aadhaarName) || '').trim(),
  }));
}

function summarize(results) {
  return results.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + 1;
    return acc;
  }, {});
}

export default function AgriStackChecker() {
  const [theme, setTheme] = useState('light');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const actionRows = useMemo(
    () => results.filter((row) => row.category === 'mismatch' || row.category === 'no-name'),
    [results]
  );

  const errorRows = useMemo(
    () => results.filter((row) => row.category === 'error'),
    [results]
  );

  const summary = useMemo(() => summarize(results), [results]);
  const resetChecker = () => {
    setFileName('');
    setRows([]);
    setResults([]);
    setLoading(false);
    setProgress({ done: 0, total: 0 });
    setError('');
    setNotice('');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setNotice('');
    setResults([]);
    setProgress({ done: 0, total: 0 });

    try {
      const parsedRows = await parseWorkbook(file);
      const validRows = parsedRows.filter((row) => row.aadhaarNumber);

      if (!validRows.length) {
        throw new Error('No valid Aadhaar rows found. Please include Aadhaar Number and Name columns.');
      }

      setRows(validRows);
      setFileName(file.name);
      setNotice(`${validRows.length} rows loaded from ${file.name}.`);
    } catch (err) {
      setRows([]);
      setFileName('');
      setError(err.message || 'Unable to read the Excel file.');
    }
  };

  const handleRunCheck = async () => {
    if (!rows.length) {
      setError('Upload an Excel file first.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setResults([]);
    setProgress({ done: 0, total: rows.length });

    try {
      const collected = [];

      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const batch = rows.slice(offset, offset + BATCH_SIZE);
        const response = await agriStackAPI.checkBatch(batch);
        collected.push(...(response.results || []));
        setProgress({ done: Math.min(offset + batch.length, rows.length), total: rows.length });
      }

      setResults(collected);
      setNotice(`Check complete. Found ${collected.length} processed rows and ${collected.filter((row) => row.category !== 'match').length} rows needing attention.`);
    } catch (err) {
      setError(err.message || 'Unable to complete the Agri Stack check.');
    }

    setLoading(false);
  };

  const handleDownload = () => {
    if (!actionRows.length) {
      setError('No mismatch or no-name rows available to download.');
      return;
    }

    const exportRows = actionRows.map((row) => ({
      'Aadhaar Number': row.aadhaarNumber,
      Name: row.aadhaarName,
      'Farmer Name': row.farmerName || '',
      Status: row.status,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agri Stack Results');
    XLSX.writeFile(workbook, 'ts-agri-stack-mismatch-report.xlsx');
  };

  return (
    <div className={`agri-tool agri-tool--${theme}`}>
      <div className="agri-tool__toolbar">
        <div className="agri-tool__theme-toggle" role="group" aria-label="Theme toggle">
          <button
            className={`agri-tool__theme-btn${theme === 'light' ? ' is-active' : ''}`}
            onClick={() => setTheme('light')}
            type="button"
          >
            Light
          </button>
          <button
            className={`agri-tool__theme-btn${theme === 'dark' ? ' is-active' : ''}`}
            onClick={() => setTheme('dark')}
            type="button"
          >
            Dark
          </button>
        </div>
      </div>

      <section className="agri-tool__hero">
        <div>
          <div className="agri-tool__eyebrow">Telangana farmer registry audit</div>
          <h1 className="agri-tool__title">TS Agri Stack Checker</h1>
          <p className="agri-tool__sub">
            Upload an Excel file with <strong>Aadhaar Number</strong> and <strong>Name</strong>.
            We will check the live Telangana Agri Stack enrolment status and export only mismatch and no-name cases.
          </p>
        </div>
        <div className="agri-tool__hero-badge">
          <span>{rows.length}</span>
          rows ready
        </div>
      </section>

      <section className="agri-tool__panel">
        <div className="agri-tool__upload">
          <label className="career-input-label" htmlFor="agri-stack-file">Excel Upload</label>
          <input
            id="agri-stack-file"
            className="agri-tool__file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
          <p className="agri-tool__hint">
            Expected columns: <code>Aadhaar Number</code>, <code>Name</code>.
          </p>
          <p className="agri-tool__hint">
            The file is processed in memory for the live lookup and is not stored by this tool.
          </p>
          {fileName && <p className="agri-tool__file-name">Loaded file: {fileName}</p>}
        </div>

        <div className="agri-tool__actions">
          <button className="career-btn career-btn--primary" onClick={handleRunCheck} disabled={loading || !rows.length}>
            {loading ? 'Checking live records...' : 'Run TS Agri Stack Check'}
          </button>
          <button className="career-btn career-btn--outline" onClick={handleDownload} disabled={!actionRows.length}>
            Download mismatch report
          </button>
          <button className="career-btn career-btn--ghost" onClick={resetChecker} disabled={loading}>
            Upload new sheet
          </button>
        </div>

        {(progress.total > 0 || loading) && (
          <div className="agri-tool__progress">
            <div className="agri-tool__progress-bar" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
        )}
        {(progress.total > 0 || loading) && (
          <p className="agri-tool__progress-text">
            Processed {progress.done} of {progress.total} rows
          </p>
        )}

        {error && <div className="career-alert career-alert--error">{error}</div>}
        {notice && <div className="career-alert career-alert--success">{notice}</div>}
      </section>

      <section className="agri-tool__summary">
        <div className="career-stat">
          <span className="career-stat__num">{summary.match || 0}</span>
          <span className="career-stat__label">Matches</span>
        </div>
        <div className="career-stat">
          <span className="career-stat__num">{summary.mismatch || 0}</span>
          <span className="career-stat__label">Mismatches</span>
        </div>
        <div className="career-stat">
          <span className="career-stat__num">{summary['no-name'] || 0}</span>
          <span className="career-stat__label">No-name Cases</span>
        </div>
        <div className="career-stat">
          <span className="career-stat__num">{summary.error || 0}</span>
          <span className="career-stat__label">Lookup Errors</span>
        </div>
      </section>

      <section className="agri-tool__results">
        <div className="agri-tool__results-head">
          <h2>Rows needing attention</h2>
          <p>Only mismatch and no-name rows appear here and in the downloadable Excel file.</p>
        </div>

        {actionRows.length === 0 ? (
          <div className="career-empty">No mismatch or no-name rows yet. Upload a file and run the checker.</div>
        ) : (
          <div className="agri-tool__table-wrap">
            <table className="agri-tool__table">
              <thead>
                <tr>
                  <th>Aadhaar Number</th>
                  <th>Name</th>
                  <th>Farmer Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {actionRows.map((row, index) => (
                  <tr key={`${row.aadhaarNumber}-${index}`}>
                    <td>{row.aadhaarNumber}</td>
                    <td>{row.aadhaarName || '-'}</td>
                    <td>{row.farmerName || '-'}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {errorRows.length > 0 && (
        <section className="agri-tool__results">
          <div className="agri-tool__results-head">
            <h2>Lookup errors</h2>
            <p>These rows could not be verified and are not included in the mismatch download.</p>
          </div>
          <div className="agri-tool__table-wrap">
            <table className="agri-tool__table">
              <thead>
                <tr>
                  <th>Aadhaar Number</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {errorRows.map((row, index) => (
                  <tr key={`${row.aadhaarNumber}-error-${index}`}>
                    <td>{row.aadhaarNumber || '-'}</td>
                    <td>{row.aadhaarName || '-'}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
