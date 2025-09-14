export type UserRole =
  | 'admin'
  | 'manager'
  | 'procurement_officer'
  | 'finance_officer'
  | 'shipping_officer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  profileImageUrl?: string;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress: number;
}

export interface DashboardStats {
  activeRequests: number;
  shipsInTransit: number;
  lcValue: number;
  completed: number;
}

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFileSelect?: (files: File[]) => void;
  existingFile?: string;
  className?: string;
  description?: string;
}

export interface StatusBadgeProps {
  status: string;
  type?: 'request' | 'contract' | 'lc' | 'vessel' | 'shipment' | 'settlement';
}

export interface FormFieldError {
  field: string;
  message: string;
}
