export type Story = { slug:string; title:string; excerpt:string; category:string; location:string; author:string; publishedAt:string; image:string; featured?:boolean; advertorial?:boolean };

export const categories=["News","Bisnis","Gaya Hidup","Olahraga","Opini"];

export const drawerMenu = [
  { href: "/", label: "Beranda" },
  { href: "/kanal/news", label: "News", sub: [
    { href: "/kanal/daerah", label: "Daerah" },
    { href: "/kanal/ekonomi", label: "Ekonomi" },
    { href: "/kanal/pendidikan", label: "Pendidikan" },
    { href: "/kanal/kesehatan", label: "Kesehatan" },
    { href: "/kanal/teknologi", label: "Teknologi" },
    { href: "/kanal/lingkungan", label: "Lingkungan" },
    { href: "/kanal/wisata-budaya", label: "Wisata & Budaya" },
  ] },
  { href: "/kanal/bisnis", label: "Bisnis", sub: [
    { href: "/kanal/umkm", label: "UMKM" },
    { href: "/kanal/industri", label: "Industri & ESDM" },
    { href: "/kanal/pasar", label: "Pasar & Keuangan" },
    { href: "/kanal/ikn", label: "IKN" },
  ] },
  { href: "/kanal/gaya-hidup", label: "Gaya Hidup", sub: [
    { href: "/kanal/kuliner", label: "Kuliner" },
    { href: "/kanal/wisata", label: "Wisata" },
    { href: "/kanal/fashion", label: "Fashion" },
    { href: "/kanal/hiburan", label: "Hiburan" },
  ] },
  { href: "/kanal/olahraga", label: "Olahraga" },
  { href: "/kanal/opini", label: "Opini" },
];
