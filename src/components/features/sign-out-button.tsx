import { signOut } from "@/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Sair
      </button>
    </form>
  );
}
