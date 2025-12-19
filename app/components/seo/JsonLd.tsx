'use client';

/**
 * JSON-LD Structured Data Components
 * Provides rich snippets for search engines
 */

interface Organization {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

interface Person {
  name: string;
  url?: string;
  image?: string;
}

interface Article {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: Person;
  publisher: Organization;
  url: string;
  wordCount?: number;
  articleSection?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Organization Schema
 */
export function OrganizationSchema({ org }: { org: Organization }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    ...(org.logo && { logo: org.logo }),
    ...(org.sameAs && { sameAs: org.sameAs }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Article Schema
 */
export function ArticleSchema({ article }: { article: Article }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    ...(article.dateModified && { dateModified: article.dateModified }),
    ...(article.wordCount && { wordCount: article.wordCount }),
    ...(article.articleSection && { articleSection: article.articleSection }),
    url: article.url,
    author: {
      '@type': 'Person',
      name: article.author.name,
      ...(article.author.url && { url: article.author.url }),
      ...(article.author.image && { image: article.author.image }),
    },
    publisher: {
      '@type': 'Organization',
      name: article.publisher.name,
      url: article.publisher.url,
      ...(article.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: article.publisher.logo,
        },
      }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Person Schema
 */
export function PersonSchema({ person }: { person: Person }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    ...(person.url && { url: person.url }),
    ...(person.image && { image: person.image }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * BreadcrumbList Schema
 */
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebSite Schema (for homepage)
 */
export function WebsiteSchema({
  name,
  url,
  description,
  searchUrl,
}: {
  name: string;
  url: string;
  description: string;
  searchUrl?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    ...(searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: searchUrl,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * FAQ Schema
 */
export function FAQSchema({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
