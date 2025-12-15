export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "reader"
  | "contributor"
  | "editor"
  | "admin"
  | "superadmin";
export type UserStatus = "active" | "suspended" | "banned";
export type PostStatus =
  | "draft"
  | "pending"
  | "scheduled"
  | "published"
  | "archived"
  | "rejected";
export type ContentType = "written" | "video" | "audio" | "visual";
export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "waitlisted";
export type CommentStatus = "visible" | "hidden" | "flagged" | "deleted";
export type ReactionType = "star" | "fire" | "heart" | "clap" | "think";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          website_url: string | null;
          twitter_handle: string | null;
          kofi_username: string | null;
          role: UserRole;
          status: UserStatus;
          email_verified: boolean;
          is_featured: boolean;
          article_count: number;
          total_views: number;
          total_reactions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          website_url?: string | null;
          twitter_handle?: string | null;
          kofi_username?: string | null;
          role?: UserRole;
          status?: UserStatus;
          email_verified?: boolean;
          is_featured?: boolean;
          article_count?: number;
          total_views?: number;
          total_reactions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          website_url?: string | null;
          twitter_handle?: string | null;
          kofi_username?: string | null;
          role?: UserRole;
          status?: UserStatus;
          email_verified?: boolean;
          is_featured?: boolean;
          article_count?: number;
          total_views?: number;
          total_reactions?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      contributor_applications: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          email: string;
          location: string | null;
          portfolio_url: string | null;
          content_types: string[];
          topics: string[];
          first_piece_pitch: string;
          why_scroungers: string;
          status: ApplicationStatus;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          location?: string | null;
          portfolio_url?: string | null;
          content_types: string[];
          topics: string[];
          first_piece_pitch: string;
          why_scroungers: string;
          status?: ApplicationStatus;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          full_name?: string;
          email?: string;
          location?: string | null;
          portfolio_url?: string | null;
          content_types?: string[];
          topics?: string[];
          first_piece_pitch?: string;
          why_scroungers?: string;
          status?: ApplicationStatus;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contributor_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contributor_applications_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string;
          icon: string | null;
          parent_id: string | null;
          sort_order: number;
          is_featured: boolean;
          post_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_featured?: boolean;
          post_count?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_featured?: boolean;
          post_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          post_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          post_count?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          post_count?: number;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          slug: string;
          subtitle: string | null;
          excerpt: string | null;
          content: Json | null;
          content_html: string | null;
          content_type: ContentType;
          featured_image_url: string | null;
          featured_image_alt: string | null;
          media_url: string | null;
          media_duration: number | null;
          media_thumbnail_url: string | null;
          gallery_urls: string[] | null;
          category_id: string | null;
          is_breaking: boolean;
          is_featured: boolean;
          is_editors_pick: boolean;
          status: PostStatus;
          published_at: string | null;
          scheduled_for: string | null;
          rejection_reason: string | null;
          meta_title: string | null;
          meta_description: string | null;
          canonical_url: string | null;
          no_index: boolean;
          view_count: number;
          unique_view_count: number;
          reaction_count: number;
          comment_count: number;
          share_count: number;
          reading_time: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          slug: string;
          subtitle?: string | null;
          excerpt?: string | null;
          content?: Json | null;
          content_html?: string | null;
          content_type: ContentType;
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          media_url?: string | null;
          media_duration?: number | null;
          media_thumbnail_url?: string | null;
          gallery_urls?: string[] | null;
          category_id?: string | null;
          is_breaking?: boolean;
          is_featured?: boolean;
          is_editors_pick?: boolean;
          status?: PostStatus;
          published_at?: string | null;
          scheduled_for?: string | null;
          rejection_reason?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          canonical_url?: string | null;
          no_index?: boolean;
          view_count?: number;
          unique_view_count?: number;
          reaction_count?: number;
          comment_count?: number;
          share_count?: number;
          reading_time?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          subtitle?: string | null;
          excerpt?: string | null;
          content?: Json | null;
          content_html?: string | null;
          content_type?: ContentType;
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          media_url?: string | null;
          media_duration?: number | null;
          media_thumbnail_url?: string | null;
          gallery_urls?: string[] | null;
          category_id?: string | null;
          is_breaking?: boolean;
          is_featured?: boolean;
          is_editors_pick?: boolean;
          status?: PostStatus;
          published_at?: string | null;
          scheduled_for?: string | null;
          rejection_reason?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          canonical_url?: string | null;
          no_index?: boolean;
          view_count?: number;
          unique_view_count?: number;
          reaction_count?: number;
          comment_count?: number;
          share_count?: number;
          reading_time?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: {
          post_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      reactions: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          reaction_type: ReactionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          reaction_type: ReactionType;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          reaction_type?: ReactionType;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          is_pinned: boolean;
          is_author_reply: boolean;
          status: CommentStatus;
          reaction_count: number;
          reply_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          is_pinned?: boolean;
          is_author_reply?: boolean;
          status?: CommentStatus;
          reaction_count?: number;
          reply_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          is_pinned?: boolean;
          status?: CommentStatus;
          reaction_count?: number;
          reply_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          }
        ];
      };
      comment_reactions: {
        Row: {
          id: string;
          user_id: string;
          comment_id: string;
          reaction_type: "like" | "dislike";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          comment_id: string;
          reaction_type: "like" | "dislike";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          comment_id?: string;
          reaction_type?: "like" | "dislike";
        };
        Relationships: [
          {
            foreignKeyName: "comment_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comment_reactions_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          }
        ];
      };
      post_views: {
        Row: {
          id: string;
          post_id: string;
          viewer_id: string | null;
          session_id: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          referrer: string | null;
          country_code: string | null;
          read_percentage: number;
          time_on_page: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          viewer_id?: string | null;
          session_id?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          referrer?: string | null;
          country_code?: string | null;
          read_percentage?: number;
          time_on_page?: number;
          created_at?: string;
        };
        Update: {
          read_percentage?: number;
          time_on_page?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      media: {
        Row: {
          id: string;
          uploader_id: string;
          filename: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          url: string;
          storage_key: string | null;
          media_type: "video" | "audio" | "image" | null;
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          duration: number | null;
          folder: string;
          alt_text: string | null;
          caption: string | null;
          processing_status:
            | "pending"
            | "processing"
            | "ready"
            | "failed"
            | "uploading";
          created_at: string;
        };
        Insert: {
          id?: string;
          uploader_id: string;
          filename: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          url: string;
          storage_key?: string | null;
          media_type?: "video" | "audio" | "image" | null;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          folder?: string;
          alt_text?: string | null;
          caption?: string | null;
          processing_status?:
            | "pending"
            | "processing"
            | "ready"
            | "failed"
            | "uploading";
          created_at?: string;
        };
        Update: {
          thumbnail_url?: string | null;
          alt_text?: string | null;
          caption?: string | null;
          processing_status?:
            | "pending"
            | "processing"
            | "ready"
            | "failed"
            | "uploading";
          storage_key?: string | null;
          media_type?: "video" | "audio" | "image" | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          user_id: string | null;
          status: "active" | "unsubscribed" | "bounced";
          source: string;
          subscribed_at: string;
          unsubscribed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          status?: "active" | "unsubscribed" | "bounced";
          source?: string;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          status?: "active" | "unsubscribed" | "bounced";
          unsubscribed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          status: "new" | "read" | "replied" | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          status?: "new" | "read" | "replied" | "archived";
          created_at?: string;
        };
        Update: {
          status?: "new" | "read" | "replied" | "archived";
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type ContributorApplication =
  Database["public"]["Tables"]["contributor_applications"]["Row"];
export type Media = Database["public"]["Tables"]["media"]["Row"];
