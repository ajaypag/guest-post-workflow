// Auth pages (login, signup, etc) should NOT have the auth wrapper
export default function PublisherAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
}