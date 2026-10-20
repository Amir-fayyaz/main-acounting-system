"use client";

import { Badge } from "@/core/components/shadcn/ui/badge/badge";
import { Input } from "@/core/components/shadcn/ui/input/input";
import { X } from "lucide-react";
import { useState } from "react";
import { Muted } from "../typography/Typography";

interface TagInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}

export function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft("");
  };

  const remove = (value: string) => onChange(values.filter((v) => v !== value));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && !draft && values.length) {
      remove(values[values.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
        placeholder={placeholder}
        className="h-8 text-xs"
      />

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} className="gap-1 pe-1 text-xs">
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                className="rounded-full hover:bg-destructive/20 p-0.5"
                aria-label={`حذف ${value}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <Muted className="text-[10px]">موردی اضافه نشده</Muted>
      )}
    </div>
  );
}
