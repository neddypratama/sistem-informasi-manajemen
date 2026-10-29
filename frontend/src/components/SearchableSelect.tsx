import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  group?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: (SelectOption | string | number)[];
  value?: string | number | null;
  onChange: (value: any, option?: SelectOption) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  threshold?: number; // Default 10. Jika options.length > threshold, search input aktif!
  required?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  error?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Pilih opsi...',
  searchPlaceholder,
  threshold = 10,
  required = false,
  disabled = false,
  className = '',
  wrapperClassName = '',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalisasi opsi agar selalu berstruktur SelectOption
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      return opt;
    });
  }, [options]);

  // Cek apakah opsi melebihi threshold (default 10)
  const isSearchable = normalizedOptions.length > threshold;

  // Temukan opsi yang sedang terpilih
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return normalizedOptions.find((o) => String(o.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus input search saat dropdown dibuka jika opsi > threshold
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, isSearchable]);

  // Filter opsi berdasarkan input pencarian
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !search.trim()) return normalizedOptions;
    const q = search.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = (opt.label || '').toLowerCase().includes(q);
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchGroup = opt.group ? opt.group.toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchGroup;
    });
  }, [normalizedOptions, isSearchable, search]);

  // Pengelompokan (Grouping) jika opsi memiliki properti group
  const groupedOptions = useMemo(() => {
    const hasGroups = filteredOptions.some((o) => !!o.group);
    if (!hasGroups) return null;

    const map = new Map<string, SelectOption[]>();
    filteredOptions.forEach((opt) => {
      const g = opt.group || 'Lainnya';
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(opt);
    });
    return Array.from(map.entries());
  }, [filteredOptions]);

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value, opt);
    setIsOpen(false);
    setSearch('');
  };

  const renderOptionItem = (opt: SelectOption) => {
    const isSelected = String(opt.value) === String(value);
    return (
      <div
        key={String(opt.value)}
        onClick={() => handleSelect(opt)}
        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
          opt.disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400'
            : isSelected
            ? 'bg-emerald-50 text-emerald-900 font-semibold'
            : 'hover:bg-slate-50 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate pr-2">
          <span className="truncate">{opt.label}</span>
          {opt.sublabel && (
            <span className="text-[11px] text-slate-400 truncate">
              ({opt.sublabel})
            </span>
          )}
          {opt.badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
              {opt.badge}
            </span>
          )}
        </div>
        {isSelected && (
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1.5" />
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1 ${wrapperClassName}`} ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger Box */}
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
          className={`w-full min-h-[38px] px-3 py-2 border rounded-xl text-xs flex items-center justify-between transition-all select-none ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer bg-white'
              : error
              ? 'border-rose-400 bg-white hover:border-rose-500 cursor-pointer'
              : 'border-slate-200 hover:border-slate-300 cursor-pointer bg-white'
          } ${className}`}
        >
          {selectedOption ? (
            <div className="flex items-center space-x-1.5 truncate pr-2">
              <span className="font-semibold text-slate-800 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-slate-400 font-normal truncate text-[11px]">
                  ({selectedOption.sublabel})
                </span>
              )}
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}

          <div className="flex items-center space-x-1 shrink-0 ml-1.5">
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Box: HANYA TAMPIL JIKA OPSI > THRESHOLD (10) */}
            {isSearchable && (
              <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-20">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchPlaceholder || `Cari dari ${normalizedOptions.length} opsi...`}
                    className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
            )}

            {/* List Item Opsi */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada opsi yang sesuai.
                </div>
              ) : groupedOptions ? (
                groupedOptions.map(([groupName, items]) => (
                  <div key={groupName} className="border-b border-slate-100 last:border-b-0">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/90 sticky top-0 z-10">
                      {groupName} ({items.length})
                    </div>
                    {items.map((opt) => renderOptionItem(opt))}
                  </div>
                ))
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredOptions.map((opt) => renderOptionItem(opt))}
                </div>
              )}
            </div>

            {/* Footer jika searchable */}
            {isSearchable && (
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                <span>{filteredOptions.length} dari {normalizedOptions.length} opsi</span>
                {search && <span className="text-emerald-600 font-semibold">Filter aktif</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
};
