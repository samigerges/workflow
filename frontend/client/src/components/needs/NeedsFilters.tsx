import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Filter, RefreshCcw } from "lucide-react";

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
    <Card className="border border-secondary-200 bg-white shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary-600" />
          Monthly scope
        </CardTitle>
        <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={onReset}>
          <RefreshCcw className="h-4 w-4" />
          Reset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="month-picker" className="text-sm font-medium text-secondary-700">
              Reporting month
            </Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                id="month-picker"
                type="month"
                value={monthKey}
                onChange={(event) => onMonthChange(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-secondary-700">Quick actions</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
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
                className="flex-1"
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
