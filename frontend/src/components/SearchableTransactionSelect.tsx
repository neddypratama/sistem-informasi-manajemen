import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown, Calendar, User, Package } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/export-utils';

export interface TransactionOptionItem {
  id: number | string;
  invoice: string;
  tanggal?: string;
  type?: string;
  total?: number | string;
  paymentMethod?: string;
  client?: {
    id?: number | string;
    name?: string;
    type?: string;
  };
  details?: Array<{
    barangId?: number;
    barang?: {
      name?: string;
      code?: string;
      satuan?: { name?: string };
    };
    qty?: number;
    hargaSatuan?: number;
    subtotal?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface SearchableTransactionSelectProps {
  transactions: TransactionOptionItem[];
  value: string | number;
  onChange: (id: string, transaction?: TransactionOptionItem) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const SearchableTransactionSelect: React.FC<SearchableTransactionSelectProps> = ({
  transactions = [],
  value,
  onChange,
  label,
  placeholder = '🔍 Cari faktur transaksi asal (ketik no nota, nama mitra, produk)...',
  required = false,
  disabled = false,
  error,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const selectedTx = useMemo(() => {
    if (!value) return null;
    return transactions.find((t) => String(t.id) === String(value)) || null;
  }, [transactions, value]);

  // Enhanced search filter
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);

    return transactions.filter((t) => {
      const invoice = (t.invoice || '').toLowerCase();
      const clientName = (t.client?.name || '').toLowerCase();
      const tanggal = (t.tanggal || '').toLowerCase();
      const paymentMethod = (t.paymentMethod || '').toLowerCase();
      const itemsText = (t.details || [])
        .map((d) => (d.barang?.name || '').toLowerCase())
        .join(' ');

      const combined = `${invoice} ${clientName} ${tanggal} ${paymentMethod} ${itemsText}`;
      return terms.every((term) => combined.includes(term));
    });
  }, [transactions, search]);

  const handleSelect = (t: TransactionOptionItem) => {
    onChange(String(t.id), t);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Box */}
      <div className="relative">
        <div
          tabIndex={disabled ? -1 : 0}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen((prev) => !prev);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className={`w-full min-h-[42px] px-3 py-2 border rounded-xl text-xs flex items-center justify-between transition-all select-none ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-90'
              : isOpen
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs cursor-pointer bg-white'
              : error
              ? 'border-rose-400 bg-white hover:border-rose-500 cursor-pointer'
              : 'border-amber-300 hover:border-amber-400 cursor-pointer bg-white'
          }`}
        >
          {selectedTx ? (
            <div className="flex items-center space-x-2 truncate pr-2">
              <span className="font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                {selectedTx.invoice}
              </span>
              <span className="font-semibold text-slate-800 truncate">
                {selectedTx.client?.name || 'Pelanggan Umum'}
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="font-mono font-bold text-emerald-700 shrink-0 hidden sm:inline">
                {formatRupiah(Number(selectedTx.total) || 0)}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            {selectedTx && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                title="Batal pilih transaksi"
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-amber-600' : ''
              }`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-20">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik no nota, nama pelanggan/mitra, atau nama barang..."
                  className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List Item Transaksi */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {transactions.length === 0
                    ? 'Tidak ada transaksi selesai yang dapat diretur untuk komoditas ini.'
                    : `Tidak ada faktur transaksi yang cocok dengan "${search}".`}
                </div>
              ) : (
                filteredTransactions.map((t) => {
                  const isSelected = String(t.id) === String(value);
                  const itemsList = (t.details || [])
                    .map((d) => {
                      const name = d.barang?.name || d.kategori?.name || 'Barang';
                      const qty = d.qty ? `${d.qty} ${d.barang?.satuan?.name || 'unit'}` : '';
                      return qty ? `${name} (${qty})` : name;
                    })
                    .join(', ');

                  return (
                    <div
                      key={String(t.id)}
                      onClick={() => handleSelect(t)}
                      className={`p-3 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/90 text-amber-950 font-semibold border-l-4 border-amber-500'
                          : 'hover:bg-amber-50/40 text-slate-700'
                      }`}
                    >
                      {/* Baris 1: Invoice, Tanggal, Metode, Nominal */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded">
                            {t.invoice}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDateIndo(t.tanggal) || t.tanggal?.slice(0, 10)}</span>
                          </span>
                          {t.paymentMethod && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                t.paymentMethod === 'TUNAI'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.paymentMethod === 'TRANSFER'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {t.paymentMethod}
                            </span>
                          )}
                        </div>

                        <span className="font-mono font-bold text-xs text-emerald-700 whitespace-nowrap">
                          {formatRupiah(Number(t.total) || 0)}
                        </span>
                      </div>

                      {/* Baris 2: Nama Klien & Status terpilih */}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.client?.name || 'Pelanggan Umum'}</span>
                          {t.client?.type && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                              {t.client.type}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0">
                            <Check className="w-3.5 h-3.5 text-amber-600" />
                            <span>Terpilih</span>
                          </div>
                        )}
                      </div>

                      {/* Baris 3: Ringkasan Rincian Barang */}
                      {itemsList && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 truncate">
                          <Package className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{itemsList}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
              <span>
                {filteredTransactions.length} dari {transactions.length} transaksi
              </span>
              {search && <span className="text-amber-700 font-semibold">Filter aktif</span>}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
};
