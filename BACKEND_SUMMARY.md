# Backend API Summary

This document outlines all backend API routes and functionality for Scroungers Multimedia.

## Core API Routes

### Posts
- `GET /api/posts` - List posts with filtering, pagination, sorting
- `POST /api/posts` - Create new post (contributor only)
- `GET /api/posts/[id]` - Get single post by ID
- `PATCH /api/posts/[id]` - Update post (author or admin)
- `DELETE /api/posts/[id]` - Delete post (author or admin)
- `GET /api/posts/slug/[slug]` - Get post by slug
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/featured` - Get featured posts
- `PATCH /api/posts/[id]/status` - Update post status (admin)

### Comments
- `GET /api/comments` - List comments for a post
- `POST /api/comments` - Create comment
- `PATCH /api/comments/[id]` - Update comment (author or admin)
- `DELETE /api/comments/[id]` - Delete comment (author or admin)
- `POST /api/comments/[id]/flag` - Flag/unflag comment

### Reactions
- `POST /api/reactions` - Toggle post reaction
- `GET /api/reactions` - Get post reaction summary
- `POST /api/reactions/comment` - Toggle comment reaction

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/me` - Get current user profile
- `GET /api/users/[username]` - Get user by username
- `POST /api/users/check-username` - Check username availability

### Categories
- `GET /api/categories` - List all categories with optional post counts

### Site Content
- `GET /api/site/content` - Get homepage content (mission, pillars, how it works)

### Homepage
- `GET /api/homepage` - Aggregated homepage data (posts, categories, content)

### YouTube
- `GET /api/youtube/playlist` - Fetch YouTube playlist videos for podcast section

### Newsletter
- `POST /api/newsletter` - Subscribe to newsletter
- `DELETE /api/newsletter` - Unsubscribe from newsletter

### Contact
- `POST /api/contact` - Submit contact form

### Media
- `POST /api/media/upload` - Upload media file (contributor only)
- `GET /api/media/presigned-url` - Get presigned URL for upload
- `POST /api/media/fetch-images` - Fetch images from external sources (X/Patreon)

### Views
- `POST /api/views` - Track post view

### Analytics
- `GET /api/analytics` - Get author analytics (author or admin)

### Notifications
- `GET /api/notifications` - List user notifications
- `GET /api/notifications/unread` - Get unread notification count
- `PATCH /api/notifications/[id]` - Mark notification as read/deleted

### Search
- `GET /api/search` - Search posts, users, categories

### Admin Routes
- `GET /api/admin/posts` - List all posts (admin)
- `GET /api/admin/posts/pending` - List pending posts for review
- `POST /api/admin/posts/[id]/moderate` - Moderate post (approve/reject)
- `GET /api/admin/applications` - List contributor applications
- `GET /api/admin/applications/[id]` - Get single application
- `POST /api/admin/applications/[id]/review` - Review application
- `GET /api/admin/users` - List all users (admin)
- `GET /api/admin/users/[id]` - Get single user (admin)
- `GET /api/admin/stats` - Get admin dashboard statistics

### Health
- `GET /api/health` - Health check endpoint

## Database Schema

### Core Tables
- `profiles` - User profiles
- `posts` - Content posts
- `comments` - Post comments
- `reactions` - Post/comment reactions
- `categories` - Content categories
- `tags` - Content tags
- `post_tags` - Post-tag relationships
- `contributor_applications` - Contributor applications
- `media` - Media files
- `newsletter_subscribers` - Newsletter subscriptions
- `contact_submissions` - Contact form submissions
- `site_settings` - Site configuration and content
- `notifications` - User notifications
- `post_views` - Post view tracking

### Views
- `posts_with_details` - Posts with author and category details
- `trending_posts` - Trending posts (last 7 days)

## Database Helpers

Located in `lib/db/`:
- `posts.ts` - Post CRUD operations
- `comments.ts` - Comment operations
- `reactions.ts` - Reaction operations
- `profiles.ts` - Profile operations
- `applications.ts` - Application operations
- `notifications.ts` - Notification operations
- `categories.ts` - Category operations
- `site-content.ts` - Site content operations
- `index.ts` - Central exports

## API Utilities

Located in `lib/api/`:
- `response.ts` - Standardized API responses
- `validation.ts` - Zod validation schemas
- `middleware.ts` - Authentication/authorization middleware
- `index.ts` - Central exports

## Authentication

- Supabase Auth for user authentication
- Row Level Security (RLS) policies on all tables
- Role-based access control (reader, contributor, editor, admin, superadmin)

## Features

- Full CRUD for posts, comments, reactions
- Real-time notifications
- Post moderation workflow
- Contributor application system
- Media upload to Cloudflare R2
- External image fetching (X/Patreon)
- Newsletter subscriptions
- Contact form submissions
- Analytics tracking
- Search functionality
- Admin dashboard APIs




