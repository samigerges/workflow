import { Card, CardContent } from "@/components/ui/card";
import { Package, Ship, TrendingUp, Users } from "lucide-react";
import type { DisplayTotals } from "@/lib/schemas";

interface KpiCardsProps {
  displayTotals: DisplayTotals;
  selectedSupplier: string | null;
}

export function KpiCards({ displayTotals, selectedSupplier }: KpiCardsProps) {
  const cards = [
    {
      title: "Total Contracted",
      value: `${displayTotals.totalContracted.toLocaleString()} tons`,
      icon: Package,
      colorClass: selectedSupplier ? 'border-blue-200 bg-blue-50/30' : 'border-secondary-200',
      iconBgClass: selectedSupplier ? 'bg-blue-200' : 'bg-blue-100',
      iconColorClass: selectedSupplier ? 'text-blue-700' : 'text-blue-600',
      subtitle: selectedSupplier ? `for ${selectedSupplier}` : null,
    },
    {
      title: "Quantity Discharged",
      value: `${displayTotals.arrivedQuantity.toLocaleString()} tons`,
      icon: Ship,
      colorClass: selectedSupplier ? 'border-green-200 bg-green-50/30' : 'border-secondary-200',
      iconBgClass: selectedSupplier ? 'bg-green-200' : 'bg-green-100',
      iconColorClass: selectedSupplier ? 'text-green-700' : 'text-green-600',
      subtitle: displayTotals.totalContracted > 0 ? 
        `${((displayTotals.arrivedQuantity / displayTotals.totalContracted) * 100).toFixed(1)}% discharged` : 
        'No contracts yet',
      subtitleClass: "text-green-600",
    },
    {
      title: "Remaining to Arrive",
      value: `${displayTotals.remainingQuantity.toLocaleString()} tons`,
      icon: TrendingUp,
      colorClass: selectedSupplier ? 'border-orange-200 bg-orange-50/30' : 'border-secondary-200',
      iconBgClass: selectedSupplier ? 'bg-orange-200' : 'bg-orange-100',
      iconColorClass: selectedSupplier ? 'text-orange-700' : 'text-orange-600',
      subtitle: displayTotals.totalContracted > 0 ? 
        `${((displayTotals.remainingQuantity / displayTotals.totalContracted) * 100).toFixed(1)}% pending` : 
        'No pending deliveries',
      subtitleClass: "text-orange-600",
    },
    {
      title: selectedSupplier ? 'Active Vessels' : 'Total Suppliers',
      value: selectedSupplier ? displayTotals.totalVessels : displayTotals.totalSuppliers,
      icon: selectedSupplier ? Ship : Users,
      colorClass: selectedSupplier ? 'border-purple-200 bg-purple-50/30' : 'border-secondary-200',
      iconBgClass: selectedSupplier ? 'bg-purple-200' : 'bg-purple-100',
      iconColorClass: selectedSupplier ? 'text-purple-700' : 'text-purple-600',
      subtitle: selectedSupplier ? 'vessels in operation' : 'active suppliers',
      subtitleClass: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className={`bg-white border ${card.colorClass}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">{card.title}</p>
                  <p className="text-3xl font-bold text-secondary-900">{card.value}</p>
                  {card.subtitle && (
                    <p className={`text-xs mt-1 ${card.subtitleClass || (selectedSupplier ? 'text-blue-600 font-medium' : 'text-secondary-600')}`}>
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 ${card.iconBgClass} rounded-lg flex items-center justify-center`}>
                  <IconComponent className={card.iconColorClass} size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}