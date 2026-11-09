import styles from "@/app/kontributor/profil/profile.module.css";

export function AccountPageHeader({ title }: { title: string }) {
  return <h1 className={styles.pageTitle}>{title}</h1>;
}
