import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const base=getSiteUrl();return{rules:{userAgent:"*",allow:"/",disallow:["/admin","/redaksi","/dashboard","/api"]},sitemap:[`${base}/sitemap.xml`,`${base}/news-sitemap.xml`]}}
