import Link from "next/link";
import type { ReactNode } from "react";
import { type Story } from "@/lib/data";

export function Meta({ story }: { story: Story }) {
  return <small className="front-meta"><span>{story.publishedAt}</span><span className="front-meta-separator" aria-hidden="true"/><span>{story.category}</span></small>;
}

export function ImageCard({ story, className = "" }: { story: Story; className?: string }) {
  return <article className={`front-image-card ${className}`}>
    <Link href={`/artikel/${story.slug}`} className="front-card-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.image} alt=""/>
    </Link>
    <Link href={`/artikel/${story.slug}`}><h2>{story.title}</h2></Link>
    <p>{story.excerpt}</p>
    <Meta story={story}/>
  </article>;
}

export function Headline({ story }: { story: Story }) {
  return <article className="front-headline">
    <Link href={`/artikel/${story.slug}`}><h2>{story.title}</h2></Link>
    <p>{story.excerpt}</p>
    <Meta story={story}/>
  </article>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="front-section-title">{children}</h2>;
}
