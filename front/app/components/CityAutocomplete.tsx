import * as React from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "./ui/input";
import { useState, useEffect, useRef } from "react";

export interface City {
    nom: string;
    code: string; // INSEE code
    codesPostaux: string[];
    population: number;
}

interface CityAutocompleteProps {
    value?: string;
    onSelect: (city: City | null) => void;
    placeholder?: string;
    className?: string;
    selectedCityCode?: string;
}

export function CityAutocomplete({ value, onSelect, placeholder = "Localisation...", className, selectedCityCode }: CityAutocompleteProps) {
    const [query, setQuery] = useState(value || "");
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isSelectionRef = useRef(false);

    // Update query when value prop changes (e.g. reset)
    useEffect(() => {
        if (value !== undefined) {
            setQuery(value);
        }
    }, [value]);

    // Close list when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce search
    useEffect(() => {
        if (query.length < 2) {
            setCities([]);
            setOpen(false);
            return;
        }

        // If the update was caused by a selection, don't search
        if (isSelectionRef.current) {
            isSelectionRef.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codesPostaux,population&boost=population&limit=5`
                );
                if (response.ok) {
                    const data = await response.json();
                    setCities(data);
                    setOpen(true);
                    setActiveIndex(-1); // Reset active index on new results
                }
            } catch (error) {
                console.error("Failed to fetch cities:", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (city: City) => {
        isSelectionRef.current = true;
        setQuery(city.nom);
        onSelect(city);
        setOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setQuery(newValue);
        // Clear selection immediately when user types
        onSelect(null);
        setOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || cities.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((prev) => (prev < cities.length - 1 ? prev + 1 : 0));
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : cities.length - 1));
                break;
            case "Enter":
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < cities.length) {
                    handleSelect(cities[activeIndex]);
                }
                break;
            case "Escape":
                setOpen(false);
                break;
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <Input
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (cities.length > 0) setOpen(true);
                }}
                placeholder={placeholder}
                className={cn("w-full", className)}
            />

            {open && (cities.length > 0 || loading) && (
                <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    {loading && (
                        <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                        </div>
                    )}
                    {!loading && (
                        <ul className="max-h-[200px] overflow-auto py-1">
                            {cities.map((city, index) => (
                                <li
                                    key={city.code}
                                    className={cn(
                                        "px-3 py-2 text-sm cursor-pointer flex flex-col transition-colors",
                                        index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                    onClick={() => handleSelect(city)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                >
                                    <span className="font-medium">{city.nom}</span>
                                    <span className="text-xs text-muted-foreground">{city.codesPostaux[0]} ({city.code})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

