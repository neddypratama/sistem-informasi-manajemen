import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, User, ChevronDown } from 'lucide-react';

export interface ClientItem {
  id: number | string;
  name: string;
  type?: string;
  phone?: string;
  address?: string;
  saldoHutang?: number;
  saldoPiutang?: number;
  [key: string]: any;
}

export interface SearchableClientSelectProps {
  clients: ClientItem[];
  value: string | number;
  onChange: (id: string, client?: ClientItem) => void;
  balanceType: 'hutang' | 'piutang';
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients = [],
  value,
  onChange,
  balanceType,
  label = 'Pilih Mitra / Client',
  placeholder = 'Ketik nama mitra, nomor HP, atau tipe...',
  required = false,
  disabled = false,
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
  }, [isOpen]);

  const selectedClient = useMemo(() => {
    if (!value) return null;
    return clients.find((c) => String(c.id) === String(value)) || null;
  }, [clients, value]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.type && c.type.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const handleSelect = (c: ClientItem) => {
    onChange(String(c.id), c);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Selector Box */}
      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className={`w-full min-h-[42px] px-3 py-2 border rounded-xl text-xs flex items-center justify-between transition-all ${
            disabled
              ? 'bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed opacity-90'
              : isOpen
              ? balanceType === 'hutang'
                ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm cursor-pointer bg-white'
                : 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm cursor-pointer bg-white'
              : 'border-slate-200 hover:border-slate-300 cursor-pointer bg-white'
          }`}
        >
          {selectedClient ? (
            <div className="flex items-center space-x-2 truncate">
              <span className={`font-bold truncate ${disabled ? 'text-slate-700' : 'text-slate-900'}`}>{selectedClient.name}</span>
              {selectedClient.type && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {selectedClient.type}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            {selectedClient && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {!disabled && (
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, telp, tipe mitra..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* List Items */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Mitra tidak ditemukan.</div>
              ) : (
                filteredClients.map((c) => {
                  const isSelected = String(c.id) === String(value);
                  const balanceVal = balanceType === 'hutang' ? c.saldoHutang : c.saldoPiutang;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-slate-100/70 font-semibold' : ''
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-800 text-xs truncate">{c.name}</span>
                          {c.type && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {c.type}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {c.phone && <span className="mr-2 text-slate-400">{c.phone}</span>}
                          <span>
                            Saldo {balanceType === 'hutang' ? 'Hutang' : 'Piutang'}:{' '}
                            <strong
                              className={
                                Number(balanceVal) > 0
                                  ? balanceType === 'hutang'
                                    ? 'text-rose-600'
                                    : 'text-amber-700'
                                  : 'text-slate-400'
                              }
                            >
                              {formatRupiah(balanceVal)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Client Summary Card */}
      {selectedClient && (
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            balanceType === 'hutang'
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center space-x-2 truncate">
            <User className="w-4 h-4 shrink-0 opacity-70" />
            <span className="truncate">
              <strong>{selectedClient.name}</strong>
              {selectedClient.phone ? ` (${selectedClient.phone})` : ''}
            </span>
          </div>
          <div className="text-right shrink-0 font-mono text-xs font-bold pl-2">
            <span className="text-[10px] font-normal uppercase block text-slate-500">
              Saldo {balanceType === 'hutang' ? 'Hutang' : 'Piutang'} Berjalan:
            </span>
            <span
              className={
                balanceType === 'hutang'
                  ? Number(selectedClient.saldoHutang) > 0
                    ? 'text-rose-700 font-extrabold'
                    : 'text-slate-600'
                  : Number(selectedClient.saldoPiutang) > 0
                  ? 'text-amber-800 font-extrabold'
                  : 'text-slate-600'
              }
            >
              {formatRupiah(balanceType === 'hutang' ? selectedClient.saldoHutang : selectedClient.saldoPiutang)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
