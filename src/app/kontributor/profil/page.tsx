import { CreditCard, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/dal";
import styles from "./profile.module.css";

export default async function ProfilePage() {
  const user = await requireUser();
  return <AccountShell role={user.role}>
        <AccountPageHeader title="Biodata" />
        <nav className={styles.tabs} aria-label="Pengaturan akun"><span className={styles.active}><UserRound />Biodata</span><span><Smartphone />Kontak</span><span><ShieldCheck />Akun</span><span><CreditCard />Rekening</span><span><Trash2 />Hapus Akun</span></nav>
        <ProfileForm profile={user} />
  </AccountShell>;
}
