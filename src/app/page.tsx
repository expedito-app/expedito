// Página provisória: no passo de login, a raiz passa a redirecionar por perfil.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
      <p className="text-label font-medium uppercase text-muted">
        Expedição portuária
      </p>
      <h1 className="mt-3 font-serif text-display font-semibold">Expedito</h1>
      <p className="mt-6 max-w-md text-lg text-muted">
        Quem está com o quê, o que está atrasado e o que está em risco.
      </p>
    </main>
  );
}
