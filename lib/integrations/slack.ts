/**
 * Slack Integration
 * Send notifications to Slack channels
 */

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: SlackBlockElement[];
  accessory?: SlackBlockElement;
  fields?: Array<{ type: string; text: string }>;
}

export interface SlackBlockElement {
  type: string;
  text?: string | { type: string; text: string; emoji?: boolean };
  url?: string;
  action_id?: string;
  value?: string;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('Slack webhook not configured, skipping notification');
    return false;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    return false;
  }
}

/**
 * Send a simple text notification
 */
export async function sendSlackNotification(
  text: string,
  options?: { channel?: string; emoji?: string }
): Promise<boolean> {
  return sendSlackMessage({
    text,
    channel: options?.channel,
    icon_emoji: options?.emoji || ':robot_face:',
  });
}

/**
 * Send new post notification
 */
export async function notifyNewPost(post: {
  title: string;
  author: string;
  url: string;
  excerpt?: string;
}): Promise<boolean> {
  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📝 New Post Published',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${post.url}|${post.title}>*\nby ${post.author}`,
        },
      },
      ...(post.excerpt
        ? [
            {
              type: 'section' as const,
              text: {
                type: 'mrkdwn' as const,
                text: `> ${post.excerpt.substring(0, 200)}...`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Read Post',
              emoji: true,
            },
            url: post.url,
          },
        ],
      },
    ],
  });
}

/**
 * Send new user notification
 */
export async function notifyNewUser(user: {
  name: string;
  email: string;
  role: string;
}): Promise<boolean> {
  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '👋 New User Registered',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${user.name}` },
          { type: 'mrkdwn', text: `*Email:*\n${user.email}` },
          { type: 'mrkdwn', text: `*Role:*\n${user.role}` },
        ],
      },
    ],
  });
}

/**
 * Send moderation alert
 */
export async function notifyModerationAlert(alert: {
  type: 'report' | 'flagged' | 'spam';
  contentType: string;
  contentId: string;
  reason: string;
  adminUrl: string;
}): Promise<boolean> {
  const emoji = alert.type === 'report' ? '🚨' : alert.type === 'spam' ? '🔴' : '⚠️';

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Moderation Alert: ${alert.type.toUpperCase()}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Content Type:*\n${alert.contentType}` },
          { type: 'mrkdwn', text: `*Reason:*\n${alert.reason}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Review',
              emoji: true,
            },
            url: alert.adminUrl,
          },
        ],
      },
    ],
    attachments: [
      {
        color: alert.type === 'spam' ? '#ff0000' : '#ffcc00',
      },
    ],
  });
}

/**
 * Send error alert
 */
export async function notifyError(error: {
  message: string;
  stack?: string;
  url?: string;
  userId?: string;
}): Promise<boolean> {
  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Error Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${error.message}\`\`\``,
        },
      },
      ...(error.stack
        ? [
            {
              type: 'section' as const,
              text: {
                type: 'mrkdwn' as const,
                text: `\`\`\`${error.stack.substring(0, 500)}\`\`\``,
              },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `URL: ${error.url || 'N/A'}` },
          { type: 'mrkdwn', text: `User: ${error.userId || 'Anonymous'}` },
        ],
      },
    ],
    attachments: [{ color: '#ff0000' }],
  });
}
