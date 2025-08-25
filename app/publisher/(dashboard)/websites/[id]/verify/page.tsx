'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Shield,
  Mail,
  Globe,
  Code,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  RefreshCw,
  ExternalLink,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';

interface Website {
  id: string;
  domain: string;
  verificationStatus: string;
  verificationMethod?: string;
  verifiedAt?: string;
}

interface VerificationMethod {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'available' | 'in_progress' | 'completed' | 'failed';
  details?: string;
}

export default function VerifyWebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: websiteId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [website, setWebsite] = useState<Website | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Verification token for the current session
  const [verificationToken, setVerificationToken] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const verificationMethods: VerificationMethod[] = [
    {
      id: 'email',
      name: 'Email Verification',
      description: 'Verify ownership by clicking a link sent to your domain email address',
      icon: Mail,
      status: 'available',
      details: 'We\'ll send a verification email to admin@yourdomain.com'
    },
    {
      id: 'dns',
      name: 'DNS TXT Record',
      description: 'Add a TXT record to your domain\'s DNS settings',
      icon: Globe,
      status: 'available',
      details: 'Add a specific TXT record to prove domain ownership'
    },
    {
      id: 'meta',
      name: 'HTML Meta Tag',
      description: 'Add a meta tag to your website\'s homepage',
      icon: Code,
      status: 'available',
      details: 'Place a verification meta tag in your site\'s <head> section'
    },
    {
      id: 'file',
      name: 'HTML File Upload',
      description: 'Upload a verification file to your website\'s root directory',
      icon: FileText,
      status: 'available',
      details: 'Upload a specific HTML file to your website'
    }
  ];

  useEffect(() => {
    loadWebsite();
    generateVerificationToken();
  }, [websiteId]);

  const loadWebsite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/publisher/websites/${websiteId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load website');
      }
      
      const data = await response.json();
      setWebsite(data.website);
      
      // If already verified, redirect back
      if (data.website.verificationStatus === 'verified') {
        router.push(`/publisher/websites/${websiteId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load website');
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationToken = () => {
    // Generate a unique token for this verification session
    const token = `linkio-verify-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    setVerificationToken(token);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const startEmailVerification = async () => {
    if (!customEmail) {
      setError('Please enter an email address');
      return;
    }
    
    if (!customEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setVerifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'email',
          token: verificationToken,
          emailAddress: customEmail // Include custom email if provided
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send verification email');
      }

      setEmailSent(true);
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setVerifying(false);
    }
  };

  const checkVerificationStatus = async () => {
    setCheckingVerification(true);
    setError('');

    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}/verify/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          token: verificationToken
        })
      });

      const data = await response.json();

      if (data.verified) {
        setSuccess('Website verified successfully!');
        setTimeout(() => {
          router.push(`/publisher/websites/${websiteId}`);
        }, 2000);
      } else {
        setError(data.message || 'Verification not yet complete. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check verification status');
    } finally {
      setCheckingVerification(false);
    }
  };

  const renderVerificationInstructions = () => {
    if (!selectedMethod || !website) return null;

    switch (selectedMethod) {
      case 'email':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Email Verification</h3>
              <p className="text-sm text-blue-800 mb-4">
                We'll send a verification email to confirm your ownership of {website.domain}
              </p>
              
              {!emailSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder={`e.g., admin@${website.domain}`}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the email address where you want to receive the verification link. 
                      Common options: admin@{website.domain}, webmaster@{website.domain}, or your personal email at the domain.
                    </p>
                  </div>
                  
                  <button
                    onClick={startEmailVerification}
                    disabled={verifying || !customEmail}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Verification Email
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Email sent to {customEmail}
                  </div>
                  <p className="text-sm text-gray-600">
                    Please check your inbox and click the verification link. 
                    The link will expire in 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      generateVerificationToken();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Didn't receive the email? Send again
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'dns':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">DNS TXT Record Verification</h3>
              <p className="text-sm text-blue-800 mb-4">
                Add the following TXT record to your domain's DNS settings:
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Record Type
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm">
                    TXT
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host/Name
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm flex items-center justify-between">
                    <span>_linkio-verify</span>
                    <button
                      onClick={() => copyToClipboard('_linkio-verify')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value/Content
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm flex items-center justify-between">
                    <span className="break-all">{verificationToken}</span>
                    <button
                      onClick={() => copyToClipboard(verificationToken)}
                      className="text-blue-600 hover:text-blue-700 ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>DNS changes can take up to 48 hours to propagate</li>
                        <li>Most changes are visible within 1-4 hours</li>
                        <li>Keep this record in place after verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={checkVerificationStatus}
                  disabled={checkingVerification}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {checkingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Verification Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'meta':
        const metaTag = `<meta name="linkio-site-verification" content="${verificationToken}" />`;
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">HTML Meta Tag Verification</h3>
              <p className="text-sm text-blue-800 mb-4">
                Add the following meta tag to the <code>&lt;head&gt;</code> section of your homepage:
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Tag
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-xs flex items-center justify-between">
                    <span className="break-all">{metaTag}</span>
                    <button
                      onClick={() => copyToClipboard(metaTag)}
                      className="text-blue-600 hover:text-blue-700 ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Example placement:</h4>
                  <pre className="bg-white p-3 rounded border border-gray-300 text-xs overflow-x-auto">
{`<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
  ${metaTag}
  <!-- Other meta tags -->
</head>
<body>
  <!-- Your content -->
</body>
</html>`}
                  </pre>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>The tag must be on your homepage (domain root)</li>
                        <li>Place it in the &lt;head&gt; section</li>
                        <li>Keep the tag after verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={checkVerificationStatus}
                  disabled={checkingVerification}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {checkingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Verification Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'file':
        const fileName = `linkio-verify-${verificationToken}.html`;
        const fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>Linkio Site Verification</title>
</head>
<body>
  <h1>Linkio Site Verification</h1>
  <p>Verification Token: ${verificationToken}</p>
</body>
</html>`;
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">HTML File Upload Verification</h3>
              <p className="text-sm text-blue-800 mb-4">
                Create and upload a verification file to your website's root directory:
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Name
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm flex items-center justify-between">
                    <span>{fileName}</span>
                    <button
                      onClick={() => copyToClipboard(fileName)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Content
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 relative">
                    <pre className="font-mono text-xs overflow-x-auto">{fileContent}</pre>
                    <button
                      onClick={() => copyToClipboard(fileContent)}
                      className="absolute top-2 right-2 text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Location
                  </label>
                  <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm">
                    https://{website?.domain}/{fileName}
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Upload the file to your website's root directory</li>
                        <li>The file must be publicly accessible</li>
                        <li>Do not modify the file content</li>
                        <li>Keep the file after verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={checkVerificationStatus}
                  disabled={checkingVerification}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {checkingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Verification Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading website details...</span>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Website not found</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/publisher/websites/${websiteId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Website Details
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verify Website Ownership</h1>
              <p className="mt-2 text-gray-600">
                Prove that you own or manage {website.domain}
              </p>
            </div>
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Verification Methods */}
        {!selectedMethod ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Verification Method</h2>
            <p className="text-gray-600 mb-6">
              Select how you'd like to verify your ownership of this website:
            </p>
            
            <div className="space-y-4">
              {verificationMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {method.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {method.description}
                        </p>
                        {method.details && (
                          <p className="text-xs text-gray-500 mt-2">
                            {method.details}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 mt-3" />
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-1">Why verify?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Establish trust with potential clients</li>
                    <li>Prevent unauthorized claims on your website</li>
                    <li>Access premium features and better visibility</li>
                    <li>Receive priority support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedMethod(null)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Choose Different Method
            </button>
            
            {renderVerificationInstructions()}
          </div>
        )}
      </div>
    </div>
  );
}