export interface ServiceProviderQuote {
  id: number;
  price: number;
  currency: string;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
}

export interface ServiceProvider {
  id: number;
  name: string;
  type: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  currency?: string | null;
  services?: string[] | null;
  notes?: string | null;
  address?: string | null;
  averagePrice?: number | null;
  latestQuote?: ServiceProviderQuote | null;
  quotes?: ServiceProviderQuote[];
  rating?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
