// Login, troca de senha e cadastro da empresa: um card branco centralizado.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4 py-12">
      <div className="card w-full max-w-md p-8 md:p-10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
            Ex
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Expedito</p>
            <p className="text-xs text-muted">Expedição portuária</p>
          </div>
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}
