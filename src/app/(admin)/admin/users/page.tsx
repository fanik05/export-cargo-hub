import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users/service";
import { deleteUserAction } from "@/actions/users";
import { formatDate } from "@/lib/format";
import { UserForm } from "@/components/admin/user-form";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const headClass = "h-10 bg-muted px-4 text-[13px] font-medium text-muted-foreground";
const cellClass = "px-4 py-3 text-sm";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Admins</h1>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-muted">
              <TableHead className={headClass}>Name</TableHead>
              <TableHead className={headClass}>Email</TableHead>
              <TableHead className={headClass}>Added</TableHead>
              <TableHead className={headClass} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-b-0 odd:bg-card even:bg-muted/40 hover:bg-amber-soft/40">
                <TableCell className={cellClass}>
                  {u.name}
                  {u.id === me.id ? " (you)" : ""}
                </TableCell>
                <TableCell className={cellClass}>{u.email}</TableCell>
                <TableCell className={cellClass}>{formatDate(u.createdAt)}</TableCell>
                <TableCell className={`${cellClass} text-right`}>
                  {u.id !== me.id && (
                    <ActionForm action={deleteUserAction.bind(null, u.id)} successMessage="Admin removed">
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        pendingText="Removing…"
                        className="h-8 rounded-md px-3 text-sm text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserForm />
    </div>
  );
}
