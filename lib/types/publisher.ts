// Publisher Portal Type Definitions

export interface PublisherWebsite {
  relationship: {
    id: string;
    publisherId: string;
    websiteId: string;
    offeringId?: string | null;  // Nullable - relationships can exist before offerings
    relationshipType: string;
    verificationStatus: string;
    isActive: boolean | null;
    isPrimary?: boolean | null;
    isPreferred: boolean | null;
    priorityRank: number | null;
    contactEmail: string | null;
    verifiedAt: Date | null;
    verifiedBy?: string | null;
    customTerms?: any;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  website: {
    id: string;
    domain: string;
    domainRating: number | null;
    totalTraffic: number | null;
    guestPostCost: string | null; // DECIMAL field comes as string
    publisherCompany: string | null;
    internalNotes: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
}

export interface PublisherPerformanceMetrics {
  id: string;
  publisherId: string;
  websiteId: string | null;
  totalOrders: number | null;
  successfulOrders: number | null;
  failedOrders: number | null;
  avgResponseTimeHours: string | null; // DECIMAL field comes as string
  avgTurnaroundDays: string | null; // DECIMAL field comes as string
  onTimeDeliveryRate: string | null;
  contentApprovalRate: string | null;
  revisionRate: string | null;
  clientSatisfactionScore: string | null;
  totalRevenue: string | null;
  avgOrderValue: string | null;
  reliabilityScore: string | null;
  lastCalculatedAt: Date | null;
  periodStart: string | Date | null;
  periodEnd: string | Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PublisherOrder {
  id: string;
  title: string;
  client: string;
  status: 'pending' | 'writing' | 'review' | 'completed' | 'cancelled';
  deadline: Date;
  amount: number;
  websiteId: string;
  websiteDomain: string;
}

export interface PublisherDashboardStats {
  totalWebsites: number;
  activeOfferings: number;
  monthlyEarnings: number;
  avgResponseTime: number;
  reliabilityScore: number;
  recentOrders: PublisherOrder[];
  topWebsites: {
    website: PublisherWebsite['website'];
    relationship: PublisherWebsite['relationship'];
    performance: PublisherPerformanceMetrics | null;
  }[];
}

export interface PublisherOffering {
  id: string;
  publisherRelationshipId: string;
  offeringType: string;
  basePrice: string;
  currency: string;
  turnaroundDays: number | null;
  isActive: boolean | null;
  availability?: string;
  contentRequirements?: {
    minWords?: number;
    maxWords?: number;
    allowedTopics?: string[];
    prohibitedTopics?: string[];
    includeImages?: boolean;
    dofollow?: boolean;
    maxLinks?: number;
  };
  restrictions?: {
    niches?: string[];
    countries?: string[];
    minimumDR?: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PublisherRelationship {
  id: string;
  publisherId: string;
  websiteId: string;
  offeringId: string | null;  // Nullable - relationships can exist before offerings
  relationshipType: string;
  verificationStatus: string;
  verificationMethod?: string | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  isActive: boolean | null;
  isPrimary?: boolean | null;
  isPreferred: boolean | null;
  priorityRank?: number | null;
  contactEmail?: string | null;
  commissionRate?: string | null;
  paymentTerms?: string | null;
  customTerms?: any;
  notes?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Website {
  id: string;
  domain: string;
  domainRating?: number | null;
  totalTraffic?: number | null;
  guestPostCost?: string | null;
  publisherCompany?: string | null;
  internalNotes?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PublisherStatCardProps {
  title: string;
  value: string;
  icon: any; // LucideIcon type from lucide-react
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'emerald' | 'red';
}