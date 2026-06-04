const axios = require('axios');

const AGRI_STACK_STATUS_URL = 'https://tlfr.agristack.gov.in/farmer-registry-api-tl/agristack/v1/api/farmerRegistryWorkFlowConfiguration/checkApprovalStatus';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://tlfr.agristack.gov.in',
  Referer: 'https://tlfr.agristack.gov.in/farmer-registry-tl/',
};

function normalizeName(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeAadhaarNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12) return digits.slice(0, 12);
  return digits.padStart(12, '0');
}

function getValueCaseInsensitive(record, keys) {
  if (!record || typeof record !== 'object') return '';

  for (const [rawKey, rawValue] of Object.entries(record)) {
    const key = rawKey.toLowerCase();
    if (keys.some((candidate) => key === candidate || key.includes(candidate))) {
      if (typeof rawValue === 'string' || typeof rawValue === 'number') {
        return String(rawValue).trim();
      }
    }
  }

  return '';
}

function extractFarmerName(data) {
  return getValueCaseInsensitive(data, [
    'farmername',
    'farmer_name',
    'nameoffarmer',
    'applicantname',
    'beneficiaryname',
    'fullname',
    'farmerfullname',
  ]);
}

function extractRegistrationStatus(data) {
  return getValueCaseInsensitive(data, [
    'registrationstatus',
    'farmerregistrationstatus',
    'enrolmentstatus',
    'status',
  ]);
}

function classifyResult(aadhaarName, farmerName, registrationStatus) {
  const normalizedAadhaarName = normalizeName(aadhaarName);
  const normalizedFarmerName = normalizeName(farmerName);

  if (!normalizedFarmerName) {
    return {
      category: 'no-name',
      status: registrationStatus || 'Not enrolled',
    };
  }

  if (normalizedAadhaarName === normalizedFarmerName) {
    return {
      category: 'match',
      status: 'Match',
    };
  }

  return {
    category: 'mismatch',
    status: 'Need to Modify',
  };
}

async function checkAgriStackRegistration({ aadhaarNumber, aadhaarName }) {
  const sanitizedAadhaarNumber = sanitizeAadhaarNumber(aadhaarNumber);
  const cleanedAadhaarName = String(aadhaarName || '').trim();

  if (!sanitizedAadhaarNumber) {
    return {
      aadhaarNumber: '',
      aadhaarName: cleanedAadhaarName,
      farmerName: '',
      registrationStatus: '',
      status: 'Invalid Aadhaar number',
      category: 'error',
    };
  }

  try {
    const response = await axios.post(
      AGRI_STACK_STATUS_URL,
      {
        isCheckStatusAgainstEnrolmentNumber: false,
        isCheckStatusAgainstCentralId: false,
        aadhaarNumber: sanitizedAadhaarNumber,
      },
      {
        timeout: 20000,
        headers: DEFAULT_HEADERS,
      }
    );

    const payload = response.data?.data || {};
    const farmerName = extractFarmerName(payload);
    const registrationStatus = extractRegistrationStatus(payload) || 'Not enrolled';
    const classification = classifyResult(cleanedAadhaarName, farmerName, registrationStatus);

    return {
      aadhaarNumber: sanitizedAadhaarNumber,
      aadhaarName: cleanedAadhaarName,
      farmerName: farmerName || '',
      registrationStatus,
      status: classification.status,
      category: classification.category,
    };
  } catch (error) {
    return {
      aadhaarNumber: sanitizedAadhaarNumber,
      aadhaarName: cleanedAadhaarName,
      farmerName: '',
      registrationStatus: '',
      status: error.response?.data?.message || error.message || 'Lookup failed',
      category: 'error',
    };
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function batchCheckAgriStack(rows) {
  return mapWithConcurrency(rows, 4, checkAgriStackRegistration);
}

module.exports = {
  batchCheckAgriStack,
  checkAgriStackRegistration,
  sanitizeAadhaarNumber,
};
