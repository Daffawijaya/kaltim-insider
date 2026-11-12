import Link from "next/link";
import { drawerMenu } from "@/lib/data";

export function ChannelSubNav({ slug }: { slug: string }) {
  const group = drawerMenu.find(item => item.href === `/kanal/${slug}`);
  if (!group?.sub) return null;
  const items = [{ href: group.href, label: group.label }, ...group.sub];
  return (
    <nav className="section-subnav" aria-label={`Sub-kanal ${group.label}`}>
      <div className="shell section-subnav-inner">
        {items.map(item => {
          const active = item.href === `/kanal/${slug}`;
          return <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}
