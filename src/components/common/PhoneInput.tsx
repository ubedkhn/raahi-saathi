import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function PhoneInput({ 
  value, 
  onChange, 
  error, 
  className,
  id,
  disabled 
}: PhoneInputProps) {
  // Strip +91 prefix for display, add back on change
  const displayValue = value?.replace(/^\+91/, '') || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 10
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    // Always store with +91 prefix
    onChange(`+91${digits}`);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
        +91
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder="9876543210"
        className={cn("pl-12", error && "border-destructive", className)}
        maxLength={10}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
