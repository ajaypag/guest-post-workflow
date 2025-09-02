import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save,
  X,
  Star
} from 'lucide-react';

interface PublisherRelationship {
  id: string;
  publisherId: string;
  isActive: boolean;
  isPrimary: boolean;
  relationshipType: string;
  verificationStatus: string;
  publisherEmail: string;
  publisherName: string;
  publisherCompany: string;
  publisherPhone: string;
  publisherPaymentEmail: string;
  publisherPaymentMethod: string;
  publisherAccountStatus: string;
}

interface PublisherContactsManagerProps {
  publisherRelationships: PublisherRelationship[];
  onUpdate: (relationships: PublisherRelationship[]) => void;
  className?: string;
}

export function PublisherContactsManager({
  publisherRelationships,
  onUpdate,
  className = ''
}: PublisherContactsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<PublisherRelationship>>({});

  const handleEdit = (relationship: PublisherRelationship) => {
    setEditingId(relationship.id);
    setEditingData(relationship);
  };

  const handleSave = () => {
    if (!editingId) return;
    
    const updatedRelationships = publisherRelationships.map(rel => 
      rel.id === editingId ? { ...rel, ...editingData } : rel
    );
    
    onUpdate(updatedRelationships);
    setEditingId(null);
    setEditingData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleToggleActive = (id: string) => {
    const updatedRelationships = publisherRelationships.map(rel =>
      rel.id === id ? { ...rel, isActive: !rel.isActive } : rel
    );
    onUpdate(updatedRelationships);
  };

  const handleSetPrimary = (id: string) => {
    const updatedRelationships = publisherRelationships.map(rel => ({
      ...rel,
      isPrimary: rel.id === id
    }));
    onUpdate(updatedRelationships);
  };

  const getStatusBadge = (relationship: PublisherRelationship) => {
    if (!relationship.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (relationship.verificationStatus === 'verified') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
    }
    
    if (relationship.verificationStatus === 'pending') {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    
    return <Badge variant="destructive">Unverified</Badge>;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'paypal':
        return <CreditCard className="w-4 h-4" />;
      case 'stripe':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Publisher Contacts ({publisherRelationships.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {publisherRelationships.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No publisher contacts found</p>
            <p className="text-sm">Publisher relationships will appear here once established</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publisherRelationships.map((relationship) => (
              <div
                key={relationship.id}
                className={`border rounded-lg p-4 transition-all ${
                  relationship.isPrimary ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {relationship.publisherCompany || 'Unknown Company'}
                    </h3>
                    {relationship.isPrimary && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                    {getStatusBadge(relationship)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(relationship.id)}
                      className={relationship.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {relationship.isActive ? (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    {!relationship.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(relationship.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    {editingId === relationship.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCancel}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(relationship)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {editingId === relationship.id ? (
                      <Input
                        value={editingData.publisherName || ''}
                        onChange={(e) => setEditingData({ ...editingData, publisherName: e.target.value })}
                        placeholder="Contact name"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span>{relationship.publisherName || 'No contact name'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {editingId === relationship.id ? (
                      <Input
                        type="email"
                        value={editingData.publisherEmail || ''}
                        onChange={(e) => setEditingData({ ...editingData, publisherEmail: e.target.value })}
                        placeholder="Email"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span>{relationship.publisherEmail || 'No email'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {editingId === relationship.id ? (
                      <Input
                        value={editingData.publisherPhone || ''}
                        onChange={(e) => setEditingData({ ...editingData, publisherPhone: e.target.value })}
                        placeholder="Phone"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span>{relationship.publisherPhone || 'No phone'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {relationship.relationshipType || 'Direct'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(relationship.publisherPaymentMethod)}
                    {editingId === relationship.id ? (
                      <Input
                        value={editingData.publisherPaymentEmail || ''}
                        onChange={(e) => setEditingData({ ...editingData, publisherPaymentEmail: e.target.value })}
                        placeholder="Payment email"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-xs">
                        {relationship.publisherPaymentEmail || 'No payment email'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Method: {relationship.publisherPaymentMethod || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Total: {publisherRelationships.length} contacts • 
            Active: {publisherRelationships.filter(r => r.isActive).length} • 
            Primary: {publisherRelationships.filter(r => r.isPrimary).length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}