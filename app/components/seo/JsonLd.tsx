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
export function FAQSchema({ questions }: { questions: { question: string; answer: string }[] }) {
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

// ============================================================================
// ENHANCED SCHEMAS (Phase 9.4)
// ============================================================================

interface VideoObject {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string; // ISO 8601 duration format
  contentUrl?: string;
  embedUrl?: string;
  publisher: Organization;
}

/**
 * Video Schema
 */
export function VideoSchema({ video }: { video: VideoObject }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.duration && { duration: video.duration }),
    ...(video.contentUrl && { contentUrl: video.contentUrl }),
    ...(video.embedUrl && { embedUrl: video.embedUrl }),
    publisher: {
      '@type': 'Organization',
      name: video.publisher.name,
      url: video.publisher.url,
      ...(video.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: video.publisher.logo,
        },
      }),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

interface HowTo {
  name: string;
  description: string;
  image?: string;
  totalTime?: string; // ISO 8601 duration
  estimatedCost?: { currency: string; value: number };
  supply?: string[];
  tool?: string[];
  steps: HowToStep[];
}

/**
 * HowTo Schema
 */
export function HowToSchema({ howTo }: { howTo: HowTo }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    ...(howTo.image && { image: howTo.image }),
    ...(howTo.totalTime && { totalTime: howTo.totalTime }),
    ...(howTo.estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: howTo.estimatedCost.currency,
        value: howTo.estimatedCost.value,
      },
    }),
    ...(howTo.supply && {
      supply: howTo.supply.map((s) => ({
        '@type': 'HowToSupply',
        name: s,
      })),
    }),
    ...(howTo.tool && {
      tool: howTo.tool.map((t) => ({
        '@type': 'HowToTool',
        name: t,
      })),
    }),
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ProfilePage {
  name: string;
  url: string;
  image?: string;
  description?: string;
  sameAs?: string[];
  mainEntity: {
    name: string;
    alternateName?: string;
    description?: string;
    image?: string;
    url?: string;
    jobTitle?: string;
    worksFor?: Organization;
    knowsAbout?: string[];
    interactionStatistic?: Array<{
      type: 'followers' | 'following' | 'posts';
      count: number;
    }>;
  };
}

/**
 * ProfilePage Schema (for author pages)
 */
export function ProfilePageSchema({ profile }: { profile: ProfilePage }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: profile.name,
    url: profile.url,
    ...(profile.image && { image: profile.image }),
    ...(profile.description && { description: profile.description }),
    ...(profile.sameAs && { sameAs: profile.sameAs }),
    mainEntity: {
      '@type': 'Person',
      name: profile.mainEntity.name,
      ...(profile.mainEntity.alternateName && {
        alternateName: profile.mainEntity.alternateName,
      }),
      ...(profile.mainEntity.description && {
        description: profile.mainEntity.description,
      }),
      ...(profile.mainEntity.image && { image: profile.mainEntity.image }),
      ...(profile.mainEntity.url && { url: profile.mainEntity.url }),
      ...(profile.mainEntity.jobTitle && { jobTitle: profile.mainEntity.jobTitle }),
      ...(profile.mainEntity.worksFor && {
        worksFor: {
          '@type': 'Organization',
          name: profile.mainEntity.worksFor.name,
          url: profile.mainEntity.worksFor.url,
        },
      }),
      ...(profile.mainEntity.knowsAbout && {
        knowsAbout: profile.mainEntity.knowsAbout,
      }),
      ...(profile.mainEntity.interactionStatistic && {
        interactionStatistic: profile.mainEntity.interactionStatistic.map((stat) => ({
          '@type': 'InteractionCounter',
          interactionType:
            stat.type === 'followers'
              ? 'https://schema.org/FollowAction'
              : stat.type === 'posts'
                ? 'https://schema.org/WriteAction'
                : 'https://schema.org/FollowAction',
          userInteractionCount: stat.count,
        })),
      }),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BlogPosting extends Article {
  keywords?: string[];
  inLanguage?: string;
  commentCount?: number;
  isAccessibleForFree?: boolean;
}

/**
 * BlogPosting Schema (enhanced Article for blog posts)
 */
export function BlogPostingSchema({ post }: { post: BlogPosting }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    description: post.description,
    image: post.image,
    datePublished: post.datePublished,
    ...(post.dateModified && { dateModified: post.dateModified }),
    ...(post.wordCount && { wordCount: post.wordCount }),
    ...(post.articleSection && { articleSection: post.articleSection }),
    ...(post.keywords && { keywords: post.keywords.join(', ') }),
    ...(post.inLanguage && { inLanguage: post.inLanguage }),
    ...(post.commentCount !== undefined && { commentCount: post.commentCount }),
    ...(post.isAccessibleForFree !== undefined && {
      isAccessibleForFree: post.isAccessibleForFree,
    }),
    url: post.url,
    author: {
      '@type': 'Person',
      name: post.author.name,
      ...(post.author.url && { url: post.author.url }),
      ...(post.author.image && { image: post.author.image }),
    },
    publisher: {
      '@type': 'Organization',
      name: post.publisher.name,
      url: post.publisher.url,
      ...(post.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: post.publisher.logo,
        },
      }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface Comment {
  text: string;
  author: Person;
  dateCreated: string;
  upvoteCount?: number;
}

interface DiscussionForumPosting extends Article {
  sharedContent?: { headline: string; url: string };
  comment?: Comment[];
}

/**
 * DiscussionForumPosting Schema (for articles with comments)
 */
export function DiscussionSchema({ post }: { post: DiscussionForumPosting }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.headline,
    text: post.description,
    datePublished: post.datePublished,
    ...(post.dateModified && { dateModified: post.dateModified }),
    author: {
      '@type': 'Person',
      name: post.author.name,
      ...(post.author.url && { url: post.author.url }),
    },
    ...(post.sharedContent && {
      sharedContent: {
        '@type': 'WebPage',
        headline: post.sharedContent.headline,
        url: post.sharedContent.url,
      },
    }),
    ...(post.comment && {
      comment: post.comment.map((c) => ({
        '@type': 'Comment',
        text: c.text,
        author: {
          '@type': 'Person',
          name: c.author.name,
          ...(c.author.url && { url: c.author.url }),
        },
        dateCreated: c.dateCreated,
        ...(c.upvoteCount !== undefined && { upvoteCount: c.upvoteCount }),
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ItemList {
  name: string;
  description?: string;
  itemListOrder?: 'Ascending' | 'Descending' | 'Unordered';
  items: Array<{
    name: string;
    url: string;
    image?: string;
    description?: string;
  }>;
}

/**
 * ItemList Schema (for category pages, search results)
 */
export function ItemListSchema({ list }: { list: ItemList }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: list.name,
    ...(list.description && { description: list.description }),
    ...(list.itemListOrder && { itemListOrder: list.itemListOrder }),
    numberOfItems: list.items.length,
    itemListElement: list.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
      ...(item.image && { image: item.image }),
      ...(item.description && { description: item.description }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface Event {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: {
    type: 'Place' | 'VirtualLocation';
    name: string;
    url?: string;
    address?: string;
  };
  organizer?: Organization;
  image?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?:
    | 'OfflineEventAttendanceMode'
    | 'OnlineEventAttendanceMode'
    | 'MixedEventAttendanceMode';
}

/**
 * Event Schema
 */
export function EventSchema({ event }: { event: Event }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.image && { image: event.image }),
    ...(event.eventStatus && {
      eventStatus: `https://schema.org/${event.eventStatus}`,
    }),
    ...(event.eventAttendanceMode && {
      eventAttendanceMode: `https://schema.org/${event.eventAttendanceMode}`,
    }),
    ...(event.location && {
      location:
        event.location.type === 'VirtualLocation'
          ? {
              '@type': 'VirtualLocation',
              url: event.location.url,
            }
          : {
              '@type': 'Place',
              name: event.location.name,
              ...(event.location.address && {
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: event.location.address,
                },
              }),
            },
    }),
    ...(event.organizer && {
      organizer: {
        '@type': 'Organization',
        name: event.organizer.name,
        url: event.organizer.url,
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

interface SoftwareApplication {
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem?: string;
  offers?: {
    price: number;
    priceCurrency: string;
  };
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  };
}

/**
 * SoftwareApplication Schema (for PWA)
 */
export function SoftwareApplicationSchema({ app }: { app: SoftwareApplication }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    description: app.description,
    applicationCategory: app.applicationCategory,
    ...(app.operatingSystem && { operatingSystem: app.operatingSystem }),
    ...(app.offers && {
      offers: {
        '@type': 'Offer',
        price: app.offers.price,
        priceCurrency: app.offers.priceCurrency,
      },
    }),
    ...(app.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: app.aggregateRating.ratingValue,
        ratingCount: app.aggregateRating.ratingCount,
        ...(app.aggregateRating.bestRating && {
          bestRating: app.aggregateRating.bestRating,
        }),
        ...(app.aggregateRating.worstRating && {
          worstRating: app.aggregateRating.worstRating,
        }),
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
