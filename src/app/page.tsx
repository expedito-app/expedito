import { redirect } from "next/navigation";

// O proxy.ts já envia cada perfil para a sua tela; isto é só o fallback.
export default function Home() {
  redirect("/login");
}
