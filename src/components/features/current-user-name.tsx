import { getCurrentProfile } from "@/lib/auth";

export async function CurrentUserName() {
  const profile = await getCurrentProfile();
  return <span className="text-sm text-muted">{profile?.full_name}</span>;
}
