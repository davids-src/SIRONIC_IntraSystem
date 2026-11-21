export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
          SIRONIC
        </p>
        <h1 className="mb-4 text-xl font-semibold">Partnerportál</h1>
        {children}
      </div>
    </main>
  );
}
