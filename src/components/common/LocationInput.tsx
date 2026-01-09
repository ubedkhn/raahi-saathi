import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { searchLocation, LocationResult, debounce } from "@/utils/geocoding";
import { cn } from "@/lib/utils";

export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationInputProps {
  placeholder?: string;
  value?: string;
  onLocationSelect: (location: LocationData) => void;
  className?: string;
  icon?: "origin" | "destination";
}

export function LocationInput({
  placeholder = "Enter location",
  value = "",
  onLocationSelect,
  className,
  icon = "origin"
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const results = await searchLocation(query);
      setSuggestions(results);
      setIsLoading(false);
      setShowDropdown(results.length > 0);
    }, 500),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    
    if (newValue.length >= 3) {
      setIsLoading(true);
      debouncedSearch(newValue);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    setInputValue(location.displayName);
    setSuggestions([]);
    setShowDropdown(false);
    onLocationSelect({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectLocation(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  const iconColor = icon === "origin" ? "text-primary" : "text-destructive";

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <MapPin className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", iconColor)} />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="pl-10 pr-10 min-h-[44px]"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
              type="button"
              className={cn(
                "w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors flex items-start gap-3",
                index === selectedIndex && "bg-muted",
                index !== suggestions.length - 1 && "border-b border-border"
              )}
              onClick={() => handleSelectLocation(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <MapPin className={cn("w-4 h-4 mt-0.5 flex-shrink-0", iconColor)} />
              <span className="line-clamp-2">{suggestion.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !isLoading && inputValue.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  );
}
