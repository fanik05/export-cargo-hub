import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="h-8 w-auto justify-center rounded-md px-3 text-[13px] text-white/70 hover:bg-navy-hover hover:text-white md:w-full md:justify-start"
      >
        Sign out
      </Button>
    </form>
  );
}
