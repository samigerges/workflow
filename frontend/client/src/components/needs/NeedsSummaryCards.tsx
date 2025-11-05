import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Package, ClipboardList, AlertTriangle } from "lucide-react";
import type { NeedsSummary } from "@/types/needs";

interface NeedsSummaryCardsProps {
  summary: NeedsSummary;
}

const formatNumber = (value: number, unit = "tons") =>
  `${Math.round(value).toLocaleString()} ${unit}`;

export function NeedsSummaryCards({ summary }: NeedsSummaryCardsProps) {
  const cards = [
    {
      title: "Total needs",
      value: summary.totalNeeds.toLocaleString(),
      description: "registered this month",
      icon: ClipboardList,
      accent: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Requested quantity",
      value: formatNumber(summary.totalRequestedQuantity),
      description: `Pending ${formatNumber(summary.pendingQuantity)} this month`,
      icon: Package,
      accent: "bg-blue-100 text-blue-700",
    },
    {
      title: "Discharged this month",
      value: formatNumber(summary.totalDischargedQuantity),
      description: `${summary.fulfillmentRate.toFixed(1)}% of monthly needs covered`,
      icon: TrendingUp,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Outstanding backlog",
      value: formatNumber(summary.backlogQuantity),
      description: `${summary.unassignedNeeds} unassigned needs`,
      icon: AlertTriangle,
      accent: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border border-secondary-200 bg-white shadow-soft">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-secondary-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <Separator />
              <p className="text-sm text-secondary-600">{card.description}</p>
              {card.title === "Discharged this month" && (
                <p className="text-xs text-secondary-500">
                  {`Overall discharged to date ${formatNumber(summary.overallDischargedQuantity)}`}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
