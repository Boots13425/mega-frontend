import { useState, useRef, useEffect } from 'react';

/**
 * SearchableDropdown - A user-friendly searchable dropdown component
 * Perfect for selecting products from a large list (500+ items)
 * 
 * @param {Array} options - Array of option objects with {id, name, category, quantity_in_stock, ...}
 * @param {Function} onSelect - Callback when an option is selected (receives the selected option object)
 * @param {string} value - Currently selected value (option id)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether the dropdown is disabled
 * @param {string} searchPlaceholder - Placeholder for search input
 * @param {Function} formatOption - Optional function to format option display
 */
function SearchableDropdown({
  options = [],
  onSelect,
  value = '',
  placeholder = 'Select an option...',
  disabled = false,
  searchPlaceholder = 'Type to search...',
  formatOption = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Get selected option
  const selectedOption = options.find(opt => opt.id === parseInt(value));

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      option.name?.toLowerCase().includes(search) ||
      option.category?.toLowerCase().includes(search) ||
      option.id?.toString().includes(search)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      default:
        if (!isOpen && e.key.length === 1) {
          setIsOpen(true);
        }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const formatDisplayText = (option) => {
    if (formatOption) {
      return formatOption(option);
    }
    // Default format: "Product Name - Category (Stock: X)"
    if (option.quantity_in_stock !== undefined) {
      return `${option.name} - ${option.category} (Stock: ${option.quantity_in_stock})`;
    }
    return `${option.name} - ${option.category}`;
  };

  // Show search term when typing, selected value when not typing
  const displayValue = isOpen ? searchTerm : (selectedOption ? formatDisplayText(selectedOption) : '');

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <div className="searchable-dropdown-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="searchable-dropdown-input"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="searchable-dropdown-arrow"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          tabIndex={-1}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="searchable-dropdown-list" ref={listRef}>
          {filteredOptions.length === 0 ? (
            <div className="searchable-dropdown-no-results">
              No products found. Try a different search term.
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`searchable-dropdown-item ${
                  selectedOption?.id === option.id ? 'selected' : ''
                } ${highlightedIndex === index ? 'highlighted' : ''}`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="searchable-dropdown-item-main">
                  {formatDisplayText(option)}
                </div>
                {option.quantity_in_stock !== undefined && (
                  <div className="searchable-dropdown-item-stock">
                    {option.quantity_in_stock > 0 ? (
                      <span className="stock-available">
                        {option.quantity_in_stock} in stock
                      </span>
                    ) : (
                      <span className="stock-unavailable">Out of stock</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
