/**
 * Discord Integration
 * Send notifications to Discord channels via webhooks
 */

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Discord color codes
export const DISCORD_COLORS = {
  primary: 0x5865f2, // Discord Blurple
  success: 0x57f287, // Green
  warning: 0xfee75c, // Yellow
  danger: 0xed4245, // Red
  info: 0x5865f2, // Blue
};

/**
 * Send a message to Discord
 */
export async function sendDiscordMessage(message: DiscordMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook not configured, skipping notification');
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        username: message.username || 'Scroungers Bot',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Discord message:', error);
    return false;
  }
}

/**
 * Send a simple text notification
 */
export async function sendDiscordNotification(content: string): Promise<boolean> {
  return sendDiscordMessage({ content });
}

/**
 * Send new post notification
 */
export async function notifyNewPost(post: {
  title: string;
  author: string;
  authorAvatar?: string;
  url: string;
  excerpt?: string;
  imageUrl?: string;
  category?: string;
}): Promise<boolean> {
  return sendDiscordMessage({
    embeds: [{
      title: post.title,
      url: post.url,
      description: post.excerpt,
      color: DISCORD_COLORS.primary,
      author: {
        name: `New post by ${post.author}`,
        icon_url: post.authorAvatar,
      },
      thumbnail: post.imageUrl ? { url: post.imageUrl } : undefined,
      fields: post.category ? [
        { name: 'Category', value: post.category, inline: true },
      ] : undefined,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Scroungers Multimedia',
      },
    }],
  });
}

/**
 * Send new member notification
 */
export async function notifyNewMember(user: {
  name: string;
  avatarUrl?: string;
  profileUrl: string;
}): Promise<boolean> {
  return sendDiscordMessage({
    embeds: [{
      title: '👋 New Member Joined!',
      description: `Welcome **${user.name}** to Scroungers Multimedia!`,
      color: DISCORD_COLORS.success,
      thumbnail: user.avatarUrl ? { url: user.avatarUrl } : undefined,
      url: user.profileUrl,
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Send milestone notification
 */
export async function notifyMilestone(milestone: {
  type: 'posts' | 'users' | 'views';
  count: number;
  message: string;
}): Promise<boolean> {
  const emojis = {
    posts: '📝',
    users: '👥',
    views: '👀',
  };

  return sendDiscordMessage({
    embeds: [{
      title: `${emojis[milestone.type]} Milestone Reached!`,
      description: milestone.message,
      color: DISCORD_COLORS.success,
      fields: [
        { name: 'Count', value: milestone.count.toLocaleString(), inline: true },
        { name: 'Type', value: milestone.type, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Send alert notification
 */
export async function notifyAlert(alert: {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  fields?: Array<{ name: string; value: string }>;
}): Promise<boolean> {
  const colors = {
    info: DISCORD_COLORS.info,
    warning: DISCORD_COLORS.warning,
    danger: DISCORD_COLORS.danger,
  };

  return sendDiscordMessage({
    embeds: [{
      title: alert.title,
      description: alert.message,
      color: colors[alert.severity],
      fields: alert.fields,
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Send weekly digest
 */
export async function notifyWeeklyDigest(digest: {
  newPosts: number;
  newUsers: number;
  totalViews: number;
  topPost?: {
    title: string;
    url: string;
    views: number;
  };
}): Promise<boolean> {
  return sendDiscordMessage({
    embeds: [{
      title: '📊 Weekly Digest',
      color: DISCORD_COLORS.primary,
      fields: [
        { name: 'New Posts', value: digest.newPosts.toString(), inline: true },
        { name: 'New Users', value: digest.newUsers.toString(), inline: true },
        { name: 'Total Views', value: digest.totalViews.toLocaleString(), inline: true },
      ],
      footer: digest.topPost ? {
        text: `Top Post: ${digest.topPost.title} (${digest.topPost.views} views)`,
      } : undefined,
      timestamp: new Date().toISOString(),
    }],
  });
}
