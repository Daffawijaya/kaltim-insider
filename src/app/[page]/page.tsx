import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { legalPages } from "@/lib/legal";
export function generateStaticParams() { return Object.keys(legalPages).map(page => ({ page })); }
export async function generateMetadata({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  return { title: legalPages[page as keyof typeof legalPages]?.title ?? "Halaman tidak ditemukan" };
}
export default async function LegalPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  const content = Object.hasOwn(legalPages, page) ? legalPages[page as keyof typeof legalPages] : null;
  if (!content) notFound();
  const contact = process.env.EDITORIAL_CONTACT_EMAIL;
  return <><SiteHeader/><main className="shell listing-page"><article className="article-body"><h1>{content.title}</h1>{content.paragraphs.map(p=><p key={p}>{p}</p>)}{page==="kontak"?(contact?<p>Email: <a href={`mailto:${contact}`}>{contact}</a></p>:<p>Alamat redaksi belum dipublikasikan. Pengelola perlu melengkapinya sebelum peluncuran.</p>):<p><Link href="/kontak">Hubungi redaksi</Link></p>}</article></main><SiteFooter/></>;
}
