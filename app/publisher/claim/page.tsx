'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Building2, Mail, Phone, Lock } from 'lucide-react';

function ClaimForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [publisherInfo, setPublisherInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    contactName: '',
    companyName: '',
    phone: '',
  });
  
  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No claim token provided');
      setValidating(false);
      return;
    }
    
    validateToken();
  }, [token]);
  
  const validateToken = async () => {
    try {
      const response = await fetch(`/api/publisher/claim?token=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Invalid claim token');
      } else {
        setPublisherInfo(data.publisher);
        setFormData(prev => ({
          ...prev,
          contactName: data.publisher.contactName || '',
          companyName: data.publisher.companyName || '',
        }));
      }
    } catch (err) {
      setError('Failed to validate claim token');
    } finally {
      setValidating(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/publisher/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to claim account');
      } else {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push(data.redirectUrl || '/publisher/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error && !publisherInfo) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Claim Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="mt-4 text-sm text-gray-600">
            If you believe this is an error, please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (success) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Account Claimed Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Your publisher account has been activated. Redirecting to your dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Claim Your Publisher Account</CardTitle>
        <CardDescription>
          Complete your account setup to start managing your websites and offerings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {publisherInfo && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Email:</strong> {publisherInfo.email}
            </p>
            {publisherInfo.source === 'manyreach' && (
              <p className="text-xs text-blue-700 mt-1">
                This account was created from your email response to our outreach
              </p>
            )}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactName">
              Contact Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              required
              placeholder="John Doe"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your Company LLC"
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Set Your Password</h3>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-3">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming Account...
              </>
            ) : (
              'Claim Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ClaimPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Publisher Portal</h1>
          <p className="mt-2 text-gray-600">Guest Post Workflow System</p>
        </div>
        
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }>
          <ClaimForm />
        </Suspense>
      </div>
    </div>
  );
}