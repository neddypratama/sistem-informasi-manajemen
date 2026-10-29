import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Package, ChevronDown } from 'lucide-react';

export interface BarangItem {
  id: number | string;
  name: string;
  code?: string;
  jenis?: { id?: number; name?: string };
  satuan?: { id?: number; name?: string };
  [key: string]: any;
}

export interface SearchableBarangSelectProps {
  barangs: BarangItem[];
  value: string | number;
  onChange: (id: string, barang?: BarangItem) => void;
  stockItems?: any[];
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export const SearchableBarangSelect: React.FC<SearchableBarangSelectProps> = ({
  barangs = [],
  value,
  onChange,
  stockItems = [],
  label = 'Pilih Produk / Komoditas',
  placeholder = '🔍 Ketik nama produk komoditas...',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
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

  const selectedBarang = useMemo(() => {
    if (!value) return null;
    return barangs.find((b) => String(b.id) === String(value)) || null;
  }, [barangs, value]);

  const filteredBarangs = useMemo(() => {
    if (!search.trim()) return barangs;
    const q = search.toLowerCase();
    return barangs.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.code && b.code.toLowerCase().includes(q)) ||
        (b.jenis?.name && b.jenis.name.toLowerCase().includes(q)),
    );
  }, [barangs, search]);

  const handleSelect = (b: BarangItem) => {
    onChange(String(b.id), b);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const getStockForBarang = (bId: number | string) => {
    if (!stockItems || stockItems.length === 0) return null;
    const match = stockItems.find((s) => Number(s.id || s.barangId) === Number(bId));
    if (!match) return null;
    return match.sisaQty !== undefined ? Number(match.sisaQty) : null;
  };

  return (
    <div className="space-y-1" ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger Box */}
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full min-h-[42px] px-3 py-2 border rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all bg-white ${
            isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {selectedBarang ? (
            <div className="flex items-center space-x-2 truncate">
              <Package className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-800 truncate">{selectedBarang.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                {selectedBarang.satuan?.name || 'Kg'}
              </span>
              {selectedBarang.jenis?.name && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hidden sm:inline">
                  {selectedBarang.jenis.name}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            {selectedBarang && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik nama produk komoditas..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Items */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredBarangs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Barang tidak ditemukan.</div>
              ) : (
                filteredBarangs.map((b) => {
                  const isSelected = String(b.id) === String(value);
                  const stockVal = getStockForBarang(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelect(b)}
                      className={`p-2.5 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-emerald-50 font-semibold' : ''
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-xs truncate">{b.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {b.satuan?.name || 'Kg'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          {b.jenis?.name && <span>{b.jenis.name}</span>}
                          {stockVal !== null && (
                            <span className="text-emerald-700 font-mono font-medium">
                              • Stok: {stockVal.toLocaleString('id-ID')} {b.satuan?.name || 'Kg'}
                            </span>
                          )}
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
    </div>
  );
};
