import type { ITransaction, TransactionType } from './types';

interface NLPResult {
  amount?: number;
  type?: TransactionType;
  note?: string;
  categoryId?: string;
  date?: string;
}

const INCOME_KEYWORDS = ['got', 'received', 'earned', 'salary', 'income', 'refund', 'won'];
const EXPENSE_KEYWORDS = ['spent', 'paid', 'bought', 'gave', 'cost', 'purchased'];
const STOP_WORDS = ['on', 'for', 'at', 'to', 'from', 'in', 'a', 'the', 'today', 'yesterday', 'rupees', 'bucks', 'rs'];

/**
 * Parses natural language input and attempts to extract transaction details.
 */
export function parseQuickAdd(text: string, history: ITransaction[]): NLPResult {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  const result: NLPResult = {};

  // 1. Extract Amount
  const amountMatch = lowerText.match(/(?:rs\.?|₹|\$)?\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1]);
  }

  // 2. Extract Type
  if (INCOME_KEYWORDS.some(kw => words.includes(kw))) {
    result.type = 'income';
  } else if (EXPENSE_KEYWORDS.some(kw => words.includes(kw))) {
    result.type = 'expense';
  } else {
    // Default to expense if not specified
    result.type = 'expense';
  }

  // 3. Extract Note
  // Remove amount, keywords, and stop words to find the core subject
  const noteWords = words.filter(w => {
    // Is it a number?
    if (w.match(/\d/)) return false;
    // Is it a keyword?
    if (INCOME_KEYWORDS.includes(w) || EXPENSE_KEYWORDS.includes(w)) return false;
    // Is it a stop word?
    if (STOP_WORDS.includes(w)) return false;
    // Is it currency symbol?
    if (w === 'rs' || w === '₹' || w === '$') return false;
    
    return true;
  });

  const extractedNote = noteWords.join(' ');
  if (extractedNote) {
    result.note = extractedNote.charAt(0).toUpperCase() + extractedNote.slice(1); // Capitalize first letter
  }

  // 4. Smart Auto-Categorization (Naive Bayes style frequency)
  if (extractedNote && history.length > 0) {
    const categoryFreq: Record<string, number> = {};
    
    for (const tx of history) {
      if (tx.type !== result.type) continue; // Only learn from same type
      
      const txNoteLower = (tx.note || '').toLowerCase();
      if (!txNoteLower) continue; // Skip empty notes to prevent universal matches
      
      // Exact match gets huge priority
      if (txNoteLower === extractedNote.toLowerCase()) {
        categoryFreq[tx.category] = (categoryFreq[tx.category] || 0) + 10;
      }
      // Substring match gets normal priority
      else if (txNoteLower.includes(extractedNote.toLowerCase()) || extractedNote.toLowerCase().includes(txNoteLower)) {
        categoryFreq[tx.category] = (categoryFreq[tx.category] || 0) + 1;
      }
    }

    let bestCat = '';
    let maxFreq = 0;
    
    for (const [catId, freq] of Object.entries(categoryFreq)) {
      if (freq > maxFreq) {
        maxFreq = freq;
        bestCat = catId;
      }
    }

    if (bestCat) {
      result.categoryId = bestCat;
    }
  }

  return result;
}
