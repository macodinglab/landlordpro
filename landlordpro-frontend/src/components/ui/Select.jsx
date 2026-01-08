import React from 'react';
import ReactSelect from 'react-select';

const Select = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Scan to select...',
  isSearchable = true,
  isClearable = false,
  isDisabled = false,
  isMulti = false,
  required = false,
  error = '',
  className = '',
  ...props
}) => {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: '1.5rem',
      padding: '4px 12px',
      borderColor: 'transparent',
      backgroundColor: state.isFocused ? (localStorage.getItem('theme') === 'dark' ? '#0f172a' : '#ffffff') : (localStorage.getItem('theme') === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc'),
      borderWidth: '2px',
      borderColor: error ? '#f43f5e' : state.isFocused ? '#8b5cf6' : 'transparent',
      boxShadow: state.isFocused ? '0 0 30px -10px rgba(139,92,246,0.3)' : 'none',
      '&:hover': {
        backgroundColor: localStorage.getItem('theme') === 'dark' ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
      },
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#0f172a',
      fontWeight: '700',
      fontStyle: 'italic',
      letterSpacing: '-0.025em',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontWeight: '700',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.1em',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#8b5cf6'
        : state.isFocused
          ? 'rgba(139,92,246,0.1)'
          : 'transparent',
      color: state.isSelected ? 'white' : (localStorage.getItem('theme') === 'dark' ? '#f8fafc' : '#0f172a'),
      cursor: 'pointer',
      padding: '12px 20px',
      fontWeight: '700',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      fontSize: '10px',
      letterSpacing: '0.1em',
      '&:active': {
        backgroundColor: '#8b5cf6',
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: localStorage.getItem('theme') === 'dark' ? '#0f172a' : '#ffffff',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      border: '1px solid rgba(139,92,246,0.2)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
      padding: '8px',
      zIndex: 9999,
    }),
    input: (provided) => ({
      ...provided,
      fontWeight: '700',
      fontStyle: 'italic',
      color: '#0f172a',
    })
  };

  return (
    <div className={`w-full group/select ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic ml-1 mb-3 group-focus-within/select:text-violet-500 transition-colors">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <ReactSelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isMulti={isMulti}
        styles={customStyles}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-bold text-rose-500 italic uppercase tracking-wider ml-1 mt-3 animate-slide-up">{error}</p>
      )}
    </div>
  );
};

export default Select;