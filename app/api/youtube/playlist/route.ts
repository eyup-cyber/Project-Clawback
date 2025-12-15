import { NextRequest } from 'next/server';
import { success, ApiError } from '@/lib/api';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { logger } from '@/lib/logger';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '@SCROUNGERSPODCAST';
const YOUTUBE_PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID;

/**
 * GET /api/youtube/playlist
 * Fetch YouTube playlist videos for the podcast section
 */
const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const maxResults = parseInt(searchParams.get('max_results') || '10', 10);

  // If no API key, return mock data
  if (!YOUTUBE_API_KEY) {
    logger.warn('YouTube API key not configured, returning mock data');
    return success({
      videos: [
        {
          id: 'episode-1',
          videoId: 'dQw4w9WgXcQ',
          title: 'Episode 12: The Universal Credit Trap',
          description: 'We discuss the realities of navigating the benefits system.',
          thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`,
          publishedAt: new Date().toISOString(),
        },
        {
          id: 'episode-2',
          videoId: 'dQw4w9WgXcQ',
          title: 'Episode 11: Housing Crisis Special',
          description: "Stories from the frontlines of Britain's housing emergency.",
          thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`,
          publishedAt: new Date().toISOString(),
        },
        {
          id: 'episode-3',
          videoId: 'dQw4w9WgXcQ',
          title: 'Episode 10: Cost of Living with Lived Experience',
          description: 'Real voices, real struggles, real solutions.',
          thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`,
          publishedAt: new Date().toISOString(),
        },
      ],
      channelUrl: 'https://www.youtube.com/@SCROUNGERSPODCAST',
    });
  }

  let videos: any[] = [];

  // Try to fetch from playlist first
  if (YOUTUBE_PLAYLIST_ID) {
    try {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${YOUTUBE_PLAYLIST_ID}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
      const playlistResponse = await fetch(playlistUrl);

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        videos =
          playlistData.items?.map((item: any) => ({
            id: item.id,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url,
            publishedAt: item.snippet.publishedAt,
          })) || [];
      }
    } catch (error) {
      logger.error('Playlist fetch error', error);
    }
  }

  // Fallback to channel uploads if playlist fails
  if (videos.length === 0 && YOUTUBE_CHANNEL_ID) {
    try {
      // First get channel ID from username
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forUsername=${YOUTUBE_CHANNEL_ID.replace('@', '')}&key=${YOUTUBE_API_KEY}`;
      const channelResponse = await fetch(channelUrl);

      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (uploadsPlaylistId) {
          const uploadsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
          const uploadsResponse = await fetch(uploadsUrl);

          if (uploadsResponse.ok) {
            const uploadsData = await uploadsResponse.json();
            videos =
              uploadsData.items?.map((item: any) => ({
                id: item.id,
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url,
                publishedAt: item.snippet.publishedAt,
              })) || [];
          }
        }
      }
    } catch (error) {
      logger.error('Channel fetch error', error);
    }
  }

  return success({
    videos,
    channelUrl: `https://www.youtube.com/${YOUTUBE_CHANNEL_ID}`,
  });
};

export const GET = withRouteHandler(handler, { logRequest: true });




