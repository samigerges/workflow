import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NeedsFiltersProps {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onReset: () => void;
}

export function NeedsFilters({
  monthKey,
  onMonthChange,
  onReset,
}: NeedsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="w-full md:max-w-xs">
        <Label htmlFor="month-picker" className="text-sm font-medium text-secondary-700">
          Reporting month
        </Label>
        <Input
          id="month-picker"
          type="month"
          value={monthKey}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const defaultMonth = `${today.getFullYear()}-${month}`;
            onMonthChange(defaultMonth);
          }}
        >
          Current month
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const reference = new Date(`${monthKey}-01T00:00:00`);
            const previous = new Date(reference);
            previous.setMonth(previous.getMonth() - 1);
            const month = String(previous.getMonth() + 1).padStart(2, "0");
            const prevMonth = `${previous.getFullYear()}-${month}`;
            onMonthChange(prevMonth);
          }}
        >
          Previous month
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
