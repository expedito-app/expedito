import { getCurrentProfile } from "@/lib/auth";

export async function CurrentUserName() {
  const profile = await getCurrentProfile();
  const initials = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-sm font-medium">{profile?.full_name}</p>
        {profile?.company_name && <p className="text-xs text-muted">{profile.company_name}</p>}
      </div>
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-pastel-blue text-xs font-semibold text-ink"
      >
        {initials}
      </span>
    </div>
  );
}
