import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import { blogPosts } from '@/data/blog-posts';
import { generatePageMetadata } from '@/lib/metadata';
import { generateArticleSchema } from '@/lib/structured-data';
import ScrollReveal from '@/components/ui/ScrollReveal';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | Savora',
    };
  }

  return generatePageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
}

// Generate static params for optimal SSG performance
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // Generate Article JSON-LD Schema
  const articleSchema = generateArticleSchema(post);

  // Get related posts (exclude current post)
  const relatedPosts = blogPosts.filter((p) => p.id !== post.id).slice(0, 2);

  return (
    <>
      {/* Inject Article Schema dynamically */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className={styles.page}>
        {/* Banner Section */}
        <div className={styles.bannerWrapper}>
          <div className="container">
            <Link href="/blog" className={styles.backBtn}>
              <ArrowLeft size={16} />
              <span>Back to Journal</span>
            </Link>
          </div>
        </div>

        {/* Article Body Container */}
        <div className="container">
          <div className={styles.grid}>
            {/* Main Article Content */}
            <div className={styles.mainCol}>
              <ScrollReveal direction="up">
                <div className={styles.header}>
                  <div className={styles.tagDate}>
                    <span className={styles.tag}>{post.tags[0]}</span>
                    <div className={styles.dateMeta}>
                      <Calendar size={14} />
                      <span>{post.date}</span>
                    </div>
                  </div>
                  
                  <h1 className={styles.title}>{post.title}</h1>

                  <div className={styles.authorRow}>
                    <div className={styles.author}>
                      <User size={16} />
                      <span>By {post.author}</span>
                    </div>
                    <div className={styles.readingTime}>
                      <Clock size={16} />
                      <span>{post.readingTime}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.15}>
                <div className={styles.featuredImgWrapper}>
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 992px) 100vw, 70vw"
                    priority
                    className={styles.featuredImg}
                  />
                </div>
              </ScrollReveal>

              {/* Rich Text Content */}
              <ScrollReveal direction="up" delay={0.25}>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </ScrollReveal>

              {/* Tags Footer */}
              <div className={styles.tagsFooter}>
                <span className={styles.tagsLabel}>Tags:</span>
                <div className={styles.tagsContainer}>
                  {post.tags.map((tag) => (
                    <span key={tag} className={styles.tagItem}>
                      #{tag.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <aside className={styles.sidebarCol}>
              <ScrollReveal direction="right" delay={0.4}>
                <div className={`${styles.sidebarCard} glassmorphism`}>
                  <h3 className={styles.sidebarTitle}>Related Stories</h3>
                  <div className={styles.relatedList}>
                    {relatedPosts.map((related) => (
                      <div key={related.id} className={styles.relatedItem}>
                        <div className={styles.relatedImgWrapper}>
                          <Image
                            src={related.image}
                            alt={related.title}
                            fill
                            sizes="120px"
                            className={styles.relatedImg}
                          />
                        </div>
                        <div className={styles.relatedContent}>
                          <span className={styles.relatedDate}>{related.date}</span>
                          <h4 className={styles.relatedTitle}>
                            <Link href={`/blog/${related.slug}`}>{related.title}</Link>
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Newsletter signup placeholder */}
                <div className={`${styles.sidebarCard} glassmorphism`} style={{ marginTop: '2rem' }}>
                  <h3 className={styles.sidebarTitle}>Savora Gazette</h3>
                  <p className={styles.gazetteDesc}>
                    Subscribe to receive invitations to private wine dinners, seasonal menu previews, and culinary stories.
                  </p>
                  <form className={styles.gazetteForm} action="#">
                    <input
                      type="email"
                      placeholder="Your email address"
                      className={styles.gazetteInput}
                    />
                    <button type="submit" className={styles.gazetteBtn}>
                      Subscribe
                    </button>
                  </form>
                </div>
              </ScrollReveal>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
