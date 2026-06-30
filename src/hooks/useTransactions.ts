/**
 * React Hook untuk mengelola transaction state
 */

import {DeviceEventEmitter} from 'react-native';
import {useCallback, useEffect, useRef, useState} from 'react';
import type { FinancialTransaction, FinancialSummary } from '../types/FinancialTransaction';
import { FinancialStorage } from '../storage/FinancialStorage';
import NotificationModule from '../native/NotificationModule';
import {TransactionCaptureService} from '../services/TransactionCaptureService';

export interface UseTransactionsResult {
  transactions: FinancialTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTransaction: (transaction: FinancialTransaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<FinancialTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => FinancialTransaction | undefined;
  searchTransactions: (query: string) => Promise<FinancialTransaction[]>;
  getTransactionsByDateRange: (startDate: number, endDate: number) => Promise<FinancialTransaction[]>;
  getFinancialSummary: (period: 'today' | 'week' | 'month' | 'all') => Promise<FinancialSummary>;
}

/**
 * Hook untuk fetch dan manage transactions
 */
export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await TransactionCaptureService.syncFromNotificationModule(NotificationModule);
      const data = await FinancialStorage.getAllTransactions();
      setTransactions(data);
    } catch (err) {
      setError(`Failed to fetch transactions: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = DeviceEventEmitter.addListener('transactionsUpdated', refresh);
    const timer = setInterval(() => {
      refresh();
    }, 15000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  const addTransaction = useCallback(
    async (transaction: FinancialTransaction) => {
      try {
        await FinancialStorage.addTransaction(transaction);
        await refresh();
      } catch (err) {
        setError(`Failed to add transaction: ${err}`);
        throw err;
      }
    },
    [refresh],
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<FinancialTransaction>) => {
      try {
        await FinancialStorage.updateTransaction(id, updates);
        await refresh();
      } catch (err) {
        setError(`Failed to update transaction: ${err}`);
        throw err;
      }
    },
    [refresh],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        await FinancialStorage.deleteTransaction(id);
        await refresh();
      } catch (err) {
        setError(`Failed to delete transaction: ${err}`);
        throw err;
      }
    },
    [refresh],
  );

  const getTransaction = useCallback(
    (id: string) => {
      return transactions.find(t => t.id === id);
    },
    [transactions],
  );

  const searchTransactions = useCallback(async (query: string) => {
    return FinancialStorage.searchTransactions(query);
  }, []);

  const getTransactionsByDateRange = useCallback(async (startDate: number, endDate: number) => {
    return FinancialStorage.getTransactionsByDateRange(startDate, endDate);
  }, []);

  const getFinancialSummary = useCallback(
    async (period: 'today' | 'week' | 'month' | 'all') => {
      return FinancialStorage.calculateFinancialSummary(period);
    },
    [],
  );

  return {
    transactions,
    loading,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransaction,
    searchTransactions,
    getTransactionsByDateRange,
    getFinancialSummary,
  };
}

/**
 * Hook untuk fetch financial summary
 */
export function useFinancialSummary(period: 'today' | 'week' | 'month' | 'all' = 'month') {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      await TransactionCaptureService.syncFromNotificationModule(NotificationModule);
      const data = await FinancialStorage.calculateFinancialSummary(period);
      setSummary(data);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(`Failed to fetch summary: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setLoading(true);
    refresh();
    const subscription = DeviceEventEmitter.addListener('transactionsUpdated', refresh);
    const timer = setInterval(() => {
      refresh();
    }, 15000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  return { summary, loading, error, refresh };
}

/**
 * Hook untuk debounced search
 */
export function useTransactionSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FinancialTransaction[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await FinancialStorage.searchTransactions(query);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  return {
    query,
    setQuery,
    results,
    searching,
  };
}
