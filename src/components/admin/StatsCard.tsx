import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const variantStyles = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
};

const iconBgStyles = {
  default: "bg-muted",
  primary: "bg-primary/10",
  success: "bg-green-100 dark:bg-green-900/30",
  warning: "bg-amber-100 dark:bg-amber-900/30",
  destructive: "bg-destructive/10",
};

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend,
  variant = "default",
  onClick 
}: StatsCardProps) => {
  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", variantStyles[variant])}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            iconBgStyles[variant]
          )}>
            <Icon className={cn("h-6 w-6", variantStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
