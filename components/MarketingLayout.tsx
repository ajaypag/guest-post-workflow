import LinkioHeader from './LinkioHeader';

interface MarketingLayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'blog' | 'tool';
  toolName?: string;
}

/**
 * MarketingLayout - Unified layout wrapper for all external/marketing pages
 * 
 * This component ensures consistent header experience across all marketing pages.
 * It automatically includes the LinkioHeader and can be extended with footer
 * and other common elements in the future.
 * 
 * Usage:
 * <MarketingLayout variant="default">
 *   {your page content}
 * </MarketingLayout>
 * 
 * For tool pages:
 * <MarketingLayout variant="tool" toolName="Anchor Text Optimizer">
 *   {your page content}
 * </MarketingLayout>
 */
export default function MarketingLayout({ 
  children, 
  variant = 'default',
  toolName 
}: MarketingLayoutProps) {
  return (
    <>
      <LinkioHeader variant={variant} toolName={toolName} />
      {children}
    </>
  );
}