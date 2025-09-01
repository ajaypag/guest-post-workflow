import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

export function ServiceFeeDisplay() {
  const serviceFee = SERVICE_FEE_CENTS / 100;
  
  return (
    <span className="font-medium">${serviceFee} gets you everything:</span>
  );
}

export function ServiceFeeFlatDisplay() {
  const serviceFee = SERVICE_FEE_CENTS / 100;
  
  return <>Real costs + ${serviceFee} flat fee (no markup games)</>;
}

export function ServiceFeeLargeDisplay() {
  const serviceFee = SERVICE_FEE_CENTS / 100;
  
  return (
    <div className="text-3xl font-bold text-gray-900 mb-1">${serviceFee}</div>
  );
}