"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search Customer" }: SearchBarProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 dark:text-dark-500" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-10 border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500"
      />
    </div>
  );
}
