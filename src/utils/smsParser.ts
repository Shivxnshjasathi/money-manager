/**
 * SMS Parser for Indian bank transaction messages.
 * Supports all major banks: SBI, HDFC, ICICI, Axis, Kotak, BOB, PNB, IndusInd, Yes Bank, etc.
 * Also supports UPI apps (GPay, PhonePe, Paytm) and wallet notifications.
 */

export interface ParsedSMS {
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  note: string;
  description: string;
  accountHint: string; // e.g. "HDFC XX1234" or "Paytm Wallet"
  date?: string; // ISO string if date found in SMS
  isValid: boolean;
}

// ── Amount Extraction ────────────────────────────────
function extractAmount(text: string): number | null {
  // Match patterns like:
  // Rs.1234.56, Rs 1234, INR 1234.56, Rs1,234.56, ₹1234, ₹ 1,23,456.78
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount|amt|debited|credited|sent|received|paid|spent)\s*(?:of\s*)?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|was|is|debited|credited)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, '');
      const amount = parseFloat(cleaned);
      if (amount > 0 && amount < 100_000_000) { // Sanity: < 10 crore
        return amount;
      }
    }
  }
  return null;
}

// ── Transaction Type Detection ───────────────────────
function detectType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();

  const creditKeywords = [
    'credited', 'received', 'refund', 'cashback', 'reversed',
    'credit', 'deposited', 'added to', 'money received',
    'cr', 'incoming', 'salary', 'reward',
  ];

  const debitKeywords = [
    'debited', 'spent', 'paid', 'purchased', 'sent',
    'withdrawn', 'debit', 'deducted', 'payment', 'dr',
    'transferred', 'txn at', 'pos', 'atm', 'purchase',
    'used at', 'charged', 'outgoing', 'bill payment',
  ];

  let creditScore = 0;
  let debitScore = 0;

  for (const kw of creditKeywords) {
    if (lower.includes(kw)) creditScore++;
  }
  for (const kw of debitKeywords) {
    if (lower.includes(kw)) debitScore++;
  }

  return creditScore > debitScore ? 'income' : 'expense';
}

// ── Account Hint Extraction ──────────────────────────
function extractAccountHint(text: string): string {
  const lower = text.toLowerCase();

  // Bank name patterns
  const bankPatterns: [RegExp, string][] = [
    [/\bsbi\b/i, 'SBI'],
    [/\bhdfc\b/i, 'HDFC'],
    [/\bicici\b/i, 'ICICI'],
    [/\baxis\b/i, 'Axis'],
    [/\bkotak\b/i, 'Kotak'],
    [/\bbob\b|bank of baroda/i, 'BOB'],
    [/\bpnb\b|punjab national/i, 'PNB'],
    [/\bindusind\b/i, 'IndusInd'],
    [/\byes\s?bank\b/i, 'Yes Bank'],
    [/\bidbi\b/i, 'IDBI'],
    [/\bunion\s?bank\b/i, 'Union Bank'],
    [/\bcanara\b/i, 'Canara'],
    [/\biob\b|indian overseas/i, 'IOB'],
    [/\bfederal\b/i, 'Federal'],
    [/\bbandhan\b/i, 'Bandhan'],
    [/\brbl\b/i, 'RBL'],
    [/\bau\s?bank\b|au small/i, 'AU Bank'],
    [/\bpaytm/i, 'Paytm'],
    [/\bphonepe/i, 'PhonePe'],
    [/\bgpay|google\s?pay/i, 'GPay'],
    [/\bamazon\s?pay/i, 'Amazon Pay'],
    [/\bcred\b/i, 'CRED'],
  ];

  let bankName = '';
  for (const [pattern, name] of bankPatterns) {
    if (pattern.test(text)) {
      bankName = name;
      break;
    }
  }

  // Account number: look for patterns like XX1234, x1234, a/c 1234, ac no 1234
  const acPatterns = [
    /(?:a\/c|ac|acct?|account)\s*(?:no\.?\s*)?[*xX]*(\d{3,6})/i,
    /[xX*]{2,}(\d{3,6})/,
    /(?:ending|linked)\s*(?:with\s*)?(\d{3,6})/i,
  ];

  let acNumber = '';
  for (const pattern of acPatterns) {
    const match = text.match(pattern);
    if (match) {
      acNumber = match[1];
      break;
    }
  }

  // Card patterns
  const cardMatch = text.match(/(?:card|cc)\s*(?:ending|no\.?)?\s*[xX*]*(\d{4})/i);
  if (cardMatch) {
    return `${bankName || 'Card'} XX${cardMatch[1]}`.trim();
  }

  if (bankName && acNumber) return `${bankName} XX${acNumber}`;
  if (bankName) return bankName;
  if (acNumber) return `Account XX${acNumber}`;

  // UPI patterns
  if (lower.includes('upi')) return 'UPI';

  return '';
}

// ── Merchant/Note Extraction ─────────────────────────
function extractNote(text: string): string {
  const patterns = [
    // "at <merchant>" or "to <merchant>"
    /(?:at|to|from|via|towards|for)\s+([A-Z][A-Za-z0-9\s&.'/-]{2,30}?)(?:\s+on|\s+ref|\s+txn|\s*\.|$)/,
    // UPI: "VPA <name>@..." → extract the name part
    /(?:vpa|upi)\s*[:\-]?\s*([a-z0-9._]+)@/i,
    // "Info: <description>"
    /info[:\s]+(.{3,40})(?:\.|$)/i,
    // After amount, some messages have the merchant
    /(?:debited|credited|paid|sent|received).*?(?:at|to|from|for)\s+(.{3,40})(?:\s+on|\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let note = match[1].trim();
      // Clean up trailing noise
      note = note.replace(/\s*(ref|txn|upi|imps|neft|on\s+\d).*$/i, '').trim();
      // Remove trailing dots/punctuation
      note = note.replace(/[.\-,;:]+$/, '').trim();
      if (note.length >= 2) {
        return note.charAt(0).toUpperCase() + note.slice(1);
      }
    }
  }

  return '';
}

// ── Date Extraction ──────────────────────────────────
function extractDate(text: string): string | undefined {
  // Match "on DD-MM-YYYY", "on DD/MM/YYYY", "on DD-MM-YY", "dated DD/MM/YYYY"
  const datePatterns = [
    /(?:on|dated|dt)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(?:\d{1,2}:\d{2})?/,
    /(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to parse the date
      const m3 = match[3] ? match[3] : undefined;
      if (m3) {
        let day = parseInt(match[1]);
        let month = parseInt(match[2]);
        let year = parseInt(m3);
        if (year < 100) year += 2000;
        
        // Sanity check
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
          const d = new Date(year, month - 1, day, 12, 0, 0);
          if (!isNaN(d.getTime())) {
            return d.toISOString();
          }
        }
      }
    }
  }

  return undefined;
}

// ── Main Parser ──────────────────────────────────────
export function parseBankSMS(smsText: string): ParsedSMS {
  const text = smsText.trim();

  if (!text || text.length < 10) {
    return { amount: 0, type: 'expense', note: '', description: '', accountHint: '', isValid: false };
  }

  const amount = extractAmount(text);
  if (!amount) {
    return { amount: 0, type: 'expense', note: '', description: text, accountHint: '', isValid: false };
  }

  const type = detectType(text);
  const accountHint = extractAccountHint(text);
  const note = extractNote(text);
  const date = extractDate(text);

  return {
    amount,
    type,
    note,
    description: text.substring(0, 200), // Store original SMS as description (truncated)
    accountHint,
    date,
    isValid: true,
  };
}

// ── Batch Parser (for multiple SMS pasted at once) ───
export function parseBulkSMS(bulkText: string): ParsedSMS[] {
  // Split by common SMS separators: double newlines, or message boundaries
  const messages = bulkText
    .split(/\n{2,}|\r\n{2,}|(?=(?:Dear|Your|Amt|Rs\.|INR|₹)\s)/i)
    .map(m => m.trim())
    .filter(m => m.length > 15);

  return messages
    .map(msg => parseBankSMS(msg))
    .filter(result => result.isValid);
}
