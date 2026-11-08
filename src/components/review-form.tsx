"use client";
import { useActionState, useState } from "react";
import { Check, RotateCcw, Send, X } from "lucide-react";
import type { ArticleStatus } from "@/lib/editorial";
import { reviewArticle, type ArticleState } from "@/app/actions/articles";

export function ReviewForm({ id, status, advertorial, expanded = false }: { id: string; status: ArticleStatus; advertorial: boolean; expanded?: boolean }) {
  const [state, action, pending] = useActionState(reviewArticle, {} as ArticleState);
  const [open, setOpen] = useState(expanded);
  if (!["submitted", "approved", "published"].includes(status)) return <p>Tidak ada keputusan untuk status ini.</p>;
  return <div className="review-actions">
    {open && <form action={action} className={expanded ? "review-panel" : "review-popover"}>
      <input type="hidden" name="id" value={id}/><input type="hidden" name="expected_status" value={status}/><label><input type="checkbox" name="advertorial" defaultChecked={advertorial}/> Kerja Sama/Advertorial</label><label htmlFor={`note-${id}`}>Catatan redaksi</label>
      <textarea id={`note-${id}`} name="note" placeholder="Wajib untuk revisi atau penolakan"/>
      <fieldset disabled={pending}><div>{status==="published"?<button name="decision" value="archived">Arsipkan</button>:["submitted","approved"].includes(status)?<><button name="decision" value="revision"><RotateCcw size={15}/> Revisi</button><button name="decision" value="rejected"><X size={15}/> Tolak</button><button name="decision" value="published" className="approve"><Send size={15}/> Terbitkan</button></>:<p>Tidak ada keputusan untuk status ini.</p>}</div></fieldset>{state.error&&<p role="alert" className="form-message error">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
    </form>}
    {!expanded && <button className="button" onClick={()=>setOpen(!open)}><Check size={16}/> Periksa</button>}
  </div>;
}
