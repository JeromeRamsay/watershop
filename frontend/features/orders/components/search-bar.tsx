"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search Order ID" }: SearchBarProps) {
  return (
    <div className="relative p-[2px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400 z-10" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-12"
      />
    </div>
  );
}
