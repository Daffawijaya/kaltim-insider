import { getSiteUrl } from "@/lib/site-url";
import type {Metadata} from "next"; import {Inter,Merriweather} from "next/font/google"; import "./globals.css";
const sans=Inter({variable:"--font-sans",subsets:["latin"]}); const serif=Merriweather({variable:"--font-serif",subsets:["latin"],weight:["400","700","900"]});
export const metadata:Metadata={metadataBase:new URL(getSiteUrl()),title:{default:"Kaltim Insider — Melihat Kaltim Lebih Dalam",template:"%s | Kaltim Insider"},description:"Berita terbaru, cerita warga, dan perspektif dari Kalimantan Timur.",openGraph:{siteName:"Kaltim Insider",locale:"id_ID",type:"website"}};
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="id" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>}
