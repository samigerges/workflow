import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUSES,
  LC_STATUSES,
  VESSEL_STATUSES,
  SHIPMENT_STATUSES,
  SETTLEMENT_STATUSES,
} from "@/lib/constants";
import {
  DEFAULT_STATUS_CONFIG,
  getRequestStatusConfig,
} from "@/lib/request-statuses";
import { StatusBadgeProps } from "@/lib/types";

export default function StatusBadge({ status, type = 'request' }: StatusBadgeProps) {
  let statusConfig;

  switch (type) {
    case 'contract':
      statusConfig = CONTRACT_STATUSES[status as keyof typeof CONTRACT_STATUSES];
      break;
    case 'lc':
      statusConfig = LC_STATUSES[status as keyof typeof LC_STATUSES];
      break;
    case 'vessel':
      statusConfig = VESSEL_STATUSES[status as keyof typeof VESSEL_STATUSES];
      break;
    case 'shipment':
      statusConfig = SHIPMENT_STATUSES[status as keyof typeof SHIPMENT_STATUSES];
      break;
    case 'settlement':
      statusConfig = SETTLEMENT_STATUSES[status as keyof typeof SETTLEMENT_STATUSES];
      break;
    default:
      statusConfig = getRequestStatusConfig(status);
  }

  if (!statusConfig) {
    statusConfig = status
      ? { label: status, color: DEFAULT_STATUS_CONFIG.color }
      : DEFAULT_STATUS_CONFIG;
  }

  return (
    <Badge className={statusConfig.color}>
      {statusConfig.label}
    </Badge>
  );
}

