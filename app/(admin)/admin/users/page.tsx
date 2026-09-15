import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users/service";
import { deleteUserAction } from "@/actions/users";
import { formatDate } from "@/lib/format";
import { UserForm } from "@/components/admin/user-form";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Admins</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Added</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name}{u.id === me.id ? " (you)" : ""}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{formatDate(u.createdAt)}</TableCell>
              <TableCell className="text-right">
                {u.id !== me.id && (
                  <ActionForm action={deleteUserAction.bind(null, u.id)} successMessage="Admin removed">
                    <SubmitButton variant="ghost" size="xs" pendingText="…">Remove</SubmitButton>
                  </ActionForm>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Add admin</h2>
        <UserForm />
      </section>
    </div>
  );
}
