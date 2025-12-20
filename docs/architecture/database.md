# Database Architecture

This document describes the database architecture for Scroungers, built on PostgreSQL via Supabase.

## Overview

Scroungers uses PostgreSQL with the following key features:

- Row Level Security (RLS) for access control
- Full-text search with GIN indexes
- JSON/JSONB for flexible data
- Triggers for automatic timestamps and versioning
- Materialized views for analytics

## Schema Organization

### Schemas

| Schema    | Purpose                           |
| --------- | --------------------------------- |
| `public`  | Main application tables           |
| `auth`    | Supabase authentication (managed) |
| `storage` | Supabase file storage (managed)   |

## Core Tables

### Users & Authentication

#### `profiles`

Extends Supabase auth.users with application-specific data.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'reader' CHECK (role IN ('reader', 'contributor', 'editor', 'admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);
```

#### `user_sessions`

Active session tracking.

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  is_suspicious BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;
```

### Content

#### `posts`

Main content table.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL,
  content_type TEXT DEFAULT 'article' CHECK (content_type IN ('article', 'video', 'audio', 'visual')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived')),
  featured_image_url TEXT,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector TSVECTOR
);

-- Indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
CREATE UNIQUE INDEX idx_posts_slug ON posts(slug);
```

#### `post_versions`

Content versioning.

```sql
CREATE TABLE post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  content JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT,
  UNIQUE(post_id, version_number)
);

CREATE INDEX idx_versions_post ON post_versions(post_id, version_number DESC);
```

#### `categories`

Content categorization.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
```

#### `tags`

Flexible content tagging.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  use_count INTEGER DEFAULT 0
);

CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_tags_use_count ON tags(use_count DESC);
```

### Engagement

#### `reactions`

Content reactions.

```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('star', 'heart', 'fire', 'lightbulb', 'clap')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, reaction_type)
);

CREATE INDEX idx_reactions_post ON reactions(post_id, reaction_type);
CREATE INDEX idx_reactions_user ON reactions(user_id);
```

#### `comments`

Content comments.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

### Analytics

#### `analytics_events`

Event tracking.

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  post_id UUID REFERENCES posts(id),
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE INDEX idx_events_type_date ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_events_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_post ON analytics_events(post_id, created_at DESC) WHERE post_id IS NOT NULL;
```

#### `daily_analytics`

Aggregated daily metrics (materialized view).

```sql
CREATE MATERIALIZED VIEW daily_analytics AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), event_type;

CREATE UNIQUE INDEX idx_daily_analytics ON daily_analytics(date, event_type);
```

### Feature Flags & Experiments

#### `feature_flags`

Feature flag configuration.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 100,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `experiments`

A/B testing.

```sql
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variants JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

CREATE TABLE experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  goal TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  converted_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row Level Security (RLS)

### Policy Examples

#### Profiles

```sql
-- Anyone can read public profiles
CREATE POLICY "Public profiles are viewable"
  ON profiles FOR SELECT
  USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Posts

```sql
-- Published posts are public
CREATE POLICY "Published posts are viewable"
  ON posts FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

-- Authors can manage own posts
CREATE POLICY "Authors can manage posts"
  ON posts FOR ALL
  USING (author_id = auth.uid());

-- Editors can manage all posts
CREATE POLICY "Editors can manage all posts"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('editor', 'admin')
    )
  );
```

## Triggers

### Automatic Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Search Vector Update

```sql
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.excerpt, '') || ' ' ||
    COALESCE(NEW.content->>'text', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, content ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_search_vector();
```

### Version History

```sql
CREATE OR REPLACE FUNCTION create_post_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO post_versions (
      post_id, version_number, title, content, created_by
    ) VALUES (
      NEW.id,
      COALESCE((SELECT MAX(version_number) FROM post_versions WHERE post_id = NEW.id), 0) + 1,
      OLD.title,
      OLD.content,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_version_posts
  BEFORE UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.status = 'published')
  EXECUTE FUNCTION create_post_version();
```

## Indexes Strategy

### Primary Indexes

- All foreign keys are indexed
- Status/type columns for filtering
- Timestamp columns for sorting
- Unique constraints for lookups

### Full-Text Search

```sql
-- GIN index for search vectors
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

-- Trigram index for fuzzy matching (requires pg_trgm)
CREATE INDEX idx_profiles_username_trgm ON profiles USING GIN(username gin_trgm_ops);
```

### Partial Indexes

```sql
-- Only index active sessions
CREATE INDEX idx_active_sessions ON user_sessions(user_id, last_activity_at)
  WHERE revoked_at IS NULL AND expires_at > NOW();

-- Only index published posts
CREATE INDEX idx_published_posts ON posts(published_at DESC)
  WHERE status = 'published';
```

## Backup & Recovery

### Automated Backups

Supabase provides:

- Point-in-time recovery (PITR)
- Daily backups
- Cross-region replication (on paid plans)

### Manual Backup

```bash
# Export via pg_dump
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Performance Considerations

### Query Optimization

1. Use `EXPLAIN ANALYZE` for slow queries
2. Add indexes for frequent WHERE clauses
3. Use materialized views for complex aggregations
4. Partition large tables by date

### Connection Pooling

Supabase uses PgBouncer:

- Transaction pooling mode
- Max connections managed automatically
- Use connection string from dashboard

### Caching Strategy

1. Cache hot data in Redis
2. Use materialized views for analytics
3. Invalidate cache on writes
4. Set appropriate TTLs

## Migrations

### Migration Files

Located in `supabase/migrations/`:

```
001_initial_schema.sql
002_notifications.sql
003_user_preferences.sql
...
```

### Running Migrations

```bash
# Apply migrations
supabase db push

# Generate migration from changes
supabase db diff -f migration_name

# Reset database (development only)
supabase db reset
```

## Monitoring

### Key Metrics

- Query execution time
- Connection count
- Cache hit ratio
- Index usage
- Lock wait time

### Supabase Dashboard

- Query performance insights
- Active connections
- Database size
- Slow query log

---

## Related Documentation

- [Architecture Overview](/docs/architecture/overview.md)
- [Security Architecture](/docs/architecture/security.md)
- [Deployment Guide](/docs/ops/deployment.md)
