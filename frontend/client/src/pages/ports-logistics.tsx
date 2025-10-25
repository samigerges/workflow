import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";
import { isUnauthorizedError } from "@/lib/authUtils";
import { buildPortsLogisticsQueryKey } from "@/features/logistics/api";
import type { PortLogisticsStats } from "@/features/logistics/types";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  type TooltipProps,
} from "recharts";

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  })}${suffix}`;
};

type QuantityChartDatum = {
  name: string;
  delivered: number;
  upcoming: number;
};

const QuantityChartTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-secondary-200/70 bg-white p-3 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900">
      <p className="font-medium text-secondary-900 dark:text-white">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="capitalize text-secondary-600 dark:text-slate-300">{entry.name}</span>
            <span className="font-medium text-secondary-900 dark:text-white">
              {formatNumber(Number(entry.value ?? 0), " t")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PortsLogisticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({
    isAuthenticated,
    isLoading: authLoading,
  });

  const queryKey = useMemo(
    () => buildPortsLogisticsQueryKey(),
    [],
  );

  const { data, isLoading, error } = useQuery<PortLogisticsStats[]>({
    queryKey,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      redirectToLogin();
    }
  }, [error, redirectToLogin]);

  const ports = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const quantityChartData = useMemo<QuantityChartDatum[]>(() => {
    if (!Array.isArray(ports)) {
      return [];
    }

    return ports.map((port) => {
      const delivered = port.assignments.reduce((total, assignment) => {
        if (assignment.isForecast) {
          return total;
        }

        return total + (assignment.quantity ?? 0);
      }, 0);

      const upcoming = port.assignments.reduce((total, assignment) => {
        if (!assignment.isForecast) {
          return total;
        }

        return total + (assignment.quantity ?? 0);
      }, 0);

      return {
        name: port.portName,
        delivered,
        upcoming,
      };
    });
  }, [ports]);

  const hasQuantityData = useMemo(
    () => quantityChartData.some((entry) => entry.delivered > 0 || entry.upcoming > 0),
    [quantityChartData],
  );

  return (
    <MainLayout
      title="Ports logistics overview"
      subtitle="Visualise delivered and upcoming tonnage across configured ports"
    >
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <Card className="border border-secondary-200/60 dark:border-slate-800/60 shadow-none">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : ports.length === 0 ? (
          <Card className="border border-dashed border-secondary-200/80 dark:border-slate-800/80 shadow-none">
            <CardContent className="py-12 text-center text-secondary-500 dark:text-slate-400">
              No port logistics data available.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border border-secondary-200/70 shadow-none dark:border-slate-800/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Port quantity outlook</CardTitle>
              </CardHeader>
              <CardContent>
                {hasQuantityData ? (
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quantityChartData} margin={{ top: 8, right: 16, left: 8, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                          angle={-25}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                          tickFormatter={(value) => formatNumber(value as number, "")}
                          width={80}
                        />
                        <RechartsTooltip content={<QuantityChartTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.08)" }} />
                        <Legend
                          wrapperStyle={{ paddingTop: 12 }}
                          formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                        />
                        <Bar dataKey="delivered" name="delivered" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="upcoming" name="upcoming" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-secondary-500 dark:text-slate-400">
                    No recent quantity data is available for the selected ports.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
