"use client";
import { useActionState } from "react";
import { setUserRole } from "@/app/actions/admin";
export function RoleForm({ id, role }: { id: string; role: string }) {
  const [state, action, pending] = useActionState(setUserRole, {});
  return <form action={action}><input type="hidden" name="id" value={id}/><select name="role" defaultValue={role} aria-label="Peran pengguna"><option value="contributor">Penulis</option><option value="editor">Editor</option><option value="admin">Admin</option></select><button className="button" disabled={pending}>Simpan</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form>;
}
