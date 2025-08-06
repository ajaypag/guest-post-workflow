export function formatCurrency(cents: number): string {
  // Handle invalid inputs
  if (cents === undefined || cents === null || isNaN(cents)) {
    return '$0.00';
  }
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}