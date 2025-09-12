import { Badge } from "@/components/ui/badge";
import { 
  REQUEST_STATUSES,
  CONTRACT_STATUSES,
  LC_STATUSES,
  VESSEL_STATUSES,
  SHIPMENT_STATUSES,
  SETTLEMENT_STATUSES,
} from "@/lib/constants";
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
      statusConfig = REQUEST_STATUSES[status as keyof typeof REQUEST_STATUSES];
  }

  if (!statusConfig) {
    statusConfig = { label: status, color: 'bg-gray-100 text-gray-800' };
  }

  return (
    <Badge className={statusConfig.color}>
      {statusConfig.label}
    </Badge>
  );
}

