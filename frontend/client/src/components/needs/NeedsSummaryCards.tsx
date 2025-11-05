import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, ClipboardList, Ship } from "lucide-react";
import type { NeedsSummary } from "@/types/needs";

interface NeedsSummaryCardsProps {
  summary: NeedsSummary;
}

const formatNumber = (value: number, unit = "tons") =>
  `${Math.round(value).toLocaleString()} ${unit}`;

export function NeedsSummaryCards({ summary }: NeedsSummaryCardsProps) {
  const cards = [
    {
      title: "Needs quantity",
      value: formatNumber(summary.totalNeedQuantity),
      description: `${summary.totalNeeds.toLocaleString()} statements recorded`,
      icon: ClipboardList,
      accent: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Contractual quantity",
      value: formatNumber(summary.totalContractedQuantity),
      description: "Aligned contracts in the selected month",
      icon: Package,
      accent: "bg-blue-100 text-blue-700",
    },
    {
      title: "Discharged quantity",
      value: formatNumber(summary.totalCompletedDischargedQuantity),
      description: "From vessels marked as completed",
      icon: Ship,
      accent: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              {card.title === "Discharged quantity" && (
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
