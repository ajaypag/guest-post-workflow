import Link from 'next/link';
import { 
  Database, 
  Users, 
  Mail, 
  BarChart3, 
  FileText, 
  Settings,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Wrench,
  UserPlus,
  GitBranch,
  Search,
  Package,
  Building,
  Globe,
  DollarSign,
  Zap
} from 'lucide-react';

export default function PublisherToolsPage() {
  const toolSections = [
    {
      title: 'Publisher Migration & Setup',
      description: 'Tools for migrating and setting up publisher data',
      icon: GitBranch,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      tools: [
        {
          name: 'Publisher Migration',
          description: 'Main migration tool for importing publishers from various sources',
          href: '/admin/publisher-migration',
          icon: Database,
          status: 'active'
        },
        {
          name: 'Migration Analytics',
          description: 'View detailed analytics about the publisher migration process',
          href: '/admin/publisher-migration/analytics',
          icon: BarChart3,
          status: 'active'
        },
        {
          name: 'Shadow Publishers',
          description: 'Manage publishers extracted from emails before claiming',
          href: '/admin/shadow-publishers',
          icon: Users,
          status: 'active'
        },
        {
          name: 'Test Shadow Publisher',
          description: 'Test the shadow to active publisher migration flow',
          href: '/admin/test-shadow-publisher',
          icon: Wrench,
          status: 'testing'
        }
      ]
    },
    {
      title: 'Email Processing & Invitations',
      description: 'Tools for processing emails and managing publisher invitations',
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      tools: [
        {
          name: 'Email Processing Logs',
          description: 'View and manage email parsing logs and extracted data',
          href: '/admin/email-processing-logs',
          icon: FileText,
          status: 'active'
        },
        {
          name: 'Email Qualification Migration',
          description: 'Migrate and qualify emails for publisher extraction',
          href: '/admin/email-qualification-migration',
          icon: CheckCircle,
          status: 'active'
        },
        {
          name: 'Account Invitations',
          description: 'Manage publisher account invitations',
          href: '/admin/account-invitations',
          icon: UserPlus,
          status: 'active'
        },
        {
          name: 'Email Testing',
          description: 'Test email parsing and extraction',
          href: '/admin/email-testing',
          icon: Wrench,
          status: 'testing'
        },
        {
          name: 'Email Sending',
          description: 'Send bulk emails to publishers',
          href: '/admin/email-sending',
          icon: Mail,
          status: 'active'
        }
      ]
    },
    {
      title: 'Publisher Management',
      description: 'Core publisher management interfaces',
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      tools: [
        {
          name: 'All Publishers',
          description: 'View and manage all publishers in the system',
          href: '/internal/publishers',
          icon: Users,
          status: 'active'
        },
        {
          name: 'Add New Publisher',
          description: 'Create a new publisher account',
          href: '/internal/publishers/new',
          icon: UserPlus,
          status: 'active'
        },
        {
          name: 'Website Management',
          description: 'Manage websites and their relationships',
          href: '/internal/websites',
          icon: Globe,
          status: 'active'
        },
        {
          name: 'Offerings Analytics',
          description: 'Analyze orphaned offerings and data quality',
          href: '/api/admin/analyze-orphaned-offerings',
          icon: BarChart3,
          status: 'api'
        }
      ]
    },
    {
      title: 'Database & Data Quality',
      description: 'Tools for maintaining data integrity and quality',
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      tools: [
        {
          name: 'Database Schema Check',
          description: 'Verify database schema integrity',
          href: '/admin/database-schema-check',
          icon: Database,
          status: 'active'
        },
        {
          name: 'Schema Audit',
          description: 'Detailed schema analysis and recommendations',
          href: '/admin/schema-audit',
          icon: Search,
          status: 'active'
        },
        {
          name: 'Fix Inclusion Status',
          description: 'Fix NULL inclusion status issues',
          href: '/admin/fix-inclusion-status',
          icon: Wrench,
          status: 'maintenance'
        },
        {
          name: 'Line Items Migration',
          description: 'Migrate line items data',
          href: '/admin/line-items-migration',
          icon: Package,
          status: 'active'
        }
      ]
    },
    {
      title: 'System Diagnostics',
      description: 'Diagnostic tools for troubleshooting',
      icon: Settings,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      tools: [
        {
          name: 'General Diagnostics',
          description: 'System-wide diagnostic information',
          href: '/admin/diagnostics',
          icon: Settings,
          status: 'active'
        },
        {
          name: 'Agent Diagnostics',
          description: 'AI agent system diagnostics',
          href: '/admin/agent-diagnostics',
          icon: Zap,
          status: 'active'
        },
        {
          name: 'Analytics Dashboard',
          description: 'Overall system analytics',
          href: '/admin/analytics',
          icon: BarChart3,
          status: 'active'
        }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'testing':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Testing</span>;
      case 'maintenance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Maintenance</span>;
      case 'api':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">API</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Publisher Migration Tools</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive collection of tools for managing the publisher migration, email processing, and data quality
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Migration Tools</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
              </div>
              <GitBranch className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email Tools</p>
                <p className="text-2xl font-semibold text-gray-900">5</p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Management</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Diagnostics</p>
                <p className="text-2xl font-semibold text-gray-900">7</p>
              </div>
              <Settings className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Tool Sections */}
        <div className="space-y-8">
          {toolSections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className={`${section.bgColor} px-6 py-4 border-b border-gray-200`}>
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-6 w-6 ${section.color}`} />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.tools.map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          className="flex items-start p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white group"
                        >
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                              <ToolIcon className="h-5 w-5 text-gray-700" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {tool.name}
                              </h3>
                              {getStatusBadge(tool.status)}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Migration SQL Files Note */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Migration SQL Files</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Remember to run the following migrations in production:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li><code>0062_shadow_publisher_migration_tracking.sql</code> - Shadow publisher data migration</li>
                <li><code>0063_cleanup_orphaned_offerings_safe.sql</code> - Clean orphaned offerings</li>
                <li><code>0061_fix_inclusion_status_defaults.sql</code> - Fix inclusion status defaults</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}