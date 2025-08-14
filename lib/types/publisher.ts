// Publisher Portal Type Definitions

export interface PublisherWebsite {
  relationship: {
    id: string;
    publisherId: string;
    websiteId: string;
    relationshipType: string;
    verificationStatus: string;
    isActive: boolean | null;
    isPreferred: boolean | null;
    priorityRank: number | null;
    contactEmail: string | null;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  website: {
    id: string;
    domain: string;
    domainRating: number | null;
    totalTraffic: number | null;
    guestPostCost: number | null;
    linkInsertionCost: number | null;
    publisherCompany: string | null;
    internalNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface PublisherPerformanceMetrics {
  id: string;
  publisherId: string;
  websiteId: string | null;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  avgResponseTimeHours: number | null;
  avgTurnaroundDays: number | null;
  onTimeDeliveryRate: string | null;
  contentApprovalRate: string | null;
  revisionRate: string | null;
  clientSatisfactionScore: string | null;
  totalRevenue: string | null;
  avgOrderValue: string | null;
  reliabilityScore: string | null;
  lastCalculatedAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  turnaroundDays: number;
  isActive: boolean;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PublisherRelationship {
  id: string;
  publisherId: string;
  websiteId: string;
  relationshipType: string;
  verificationStatus: string;
  verificationMethod?: string | null;
  verifiedAt?: Date | null;
  isActive: boolean | null;
  isPreferred: boolean | null;
  priorityRank?: number | null;
  contactEmail?: string | null;
  commissionRate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Website {
  id: string;
  domain: string;
  domainRating?: number | null;
  totalTraffic?: number | null;
  guestPostCost?: number | null;
  linkInsertionCost?: number | null;
  publisherCompany?: string | null;
  internalNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
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