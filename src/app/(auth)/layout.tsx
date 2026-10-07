export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="text-label font-medium uppercase text-muted">
        Expedição portuária
      </p>
      <p className="mt-2 font-serif text-title font-semibold">Expedito</p>
      <div className="mt-12">{children}</div>
    </main>
  );
}
