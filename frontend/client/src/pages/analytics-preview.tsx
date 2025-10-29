import { TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SAMPLE_METRICS = [
  {
    title: "On-Time Deliveries",
    value: "92%",
    trend: "+4.2% vs last quarter",
    icon: TrendingUp,
  },
  {
    title: "Average Cycle Time",
    value: "32 days",
    trend: "-6 days vs benchmark",
    icon: BarChart3,
  },
  {
    title: "Compliance Score",
    value: "98%",
    trend: "Audited monthly",
    icon: ShieldCheck,
  },
];

const SAMPLE_INSIGHTS = [
  "Suppliers in the MENA region deliver five days faster on average",
  "Contracts with digital documentation close 12% sooner",
  "Multi-port voyages reduce transport costs by 8% per shipment",
];

export default function AnalyticsPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary-50 via-white to-white py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <Badge className="mx-auto w-fit" variant="secondary">
            Public preview
          </Badge>
          <h1 className="text-4xl font-bold text-secondary-900">
            Operations analytics snapshot
          </h1>
          <p className="text-lg text-secondary-600 max-w-3xl mx-auto">
            Explore a read-only preview of the analytics workspace. Sign in to
            unlock live KPIs, drill-down filters, and data exports tailored to
            your organization.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {SAMPLE_METRICS.map(({ title, value, trend, icon: Icon }) => (
            <Card key={title} className="border-secondary-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-secondary-600">
                  {title}
                </CardTitle>
                <Icon className="h-5 w-5 text-primary-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-3xl font-semibold text-secondary-900">{value}</p>
                <p className="text-sm text-secondary-500">{trend}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-secondary-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-secondary-900">Workflow coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-secondary-600">
              <p>
                The unified workspace tracks each milestone from the needs
                statement through final settlement. Drill into any step to view
                accountable teams, outstanding tasks, and supporting documents.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Interactive filters by supplier, vessel, and schedule</li>
                <li>• Automated alerts for pending approvals</li>
                <li>• Export-ready audit history for every contract</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-secondary-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-secondary-900">Insights in action</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-secondary-600 text-sm">
                {SAMPLE_INSIGHTS.map((insight) => (
                  <li key={insight} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" aria-hidden />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <footer className="text-center text-secondary-600">
          <p className="text-sm">
            Ready to see the live workspace? Sign in for full analytics,
            real-time updates, and collaboration tools.
          </p>
        </footer>
      </div>
    </div>
  );
}
