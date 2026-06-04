interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Podcast Index MCP — wraps the Podcast Index API (podcastindex.org)
 *
 * The open podcast database: podcast search, podcast metadata, episodes,
 * and trending podcasts across the public podcast ecosystem.
 *
 * Tools:
 * - search_podcasts: podcast search by term — find podcasts by name/keyword
 * - get_podcast: full metadata for a single podcast feed
 * - episodes: recent episodes for a podcast feed
 * - trending: trending podcasts (optionally by language/category)
 *
 * Auth: Podcast Index requires an API KEY + API SECRET, sent as signed
 * headers (X-Auth-Key, X-Auth-Date, Authorization = sha1(key+secret+date)).
 * To fit the single-key model, credentials are passed via _apiKey as
 * "KEY:SECRET" (key and secret joined by a colon). _apiKey is OPTIONAL —
 * omit it to use the shared Pipeworx key.
 */


const BASE_URL = 'https://api.podcastindex.org/api/1.0';

const APIKEY_PROP = {
  type: 'string' as const,
  description:
    'Optional — your own Podcast Index credentials as KEY:SECRET for higher limits; omit to use the shared Pipeworx key.',
};

const tools: McpToolExport['tools'] = [
  {
    name: 'search_podcasts',
    description:
      'Podcast search by term. Find podcasts in the open podcast database by name or keyword. Returns matching podcasts with title, author, description, categories, episode count, and artwork. Example: search_podcasts({ query: "true crime", max: 10 })',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term — podcast name or keyword, e.g. "true crime", "javascript"',
        },
        max: {
          type: 'number',
          description: 'Maximum number of podcasts to return (default 10, max 40)',
        },
        _apiKey: APIKEY_PROP,
      },
      required: ['query'],
    },
  },
  {
    name: 'get_podcast',
    description:
      'Get full metadata for a single podcast by its Podcast Index feed ID. Returns title, author, description, owner, episode count, categories, language, and artwork. Example: get_podcast({ feed_id: 920666 })',
    inputSchema: {
      type: 'object',
      properties: {
        feed_id: {
          type: 'number',
          description: 'Podcast Index feed ID (from search_podcasts or trending podcasts results)',
        },
        _apiKey: APIKEY_PROP,
      },
      required: ['feed_id'],
    },
  },
  {
    name: 'episodes',
    description:
      'List recent episodes for a podcast by its Podcast Index feed ID. Returns episode title, description, publish date, duration, audio URL, and episode/season numbers. Example: episodes({ feed_id: 920666, max: 10 })',
    inputSchema: {
      type: 'object',
      properties: {
        feed_id: {
          type: 'number',
          description: 'Podcast Index feed ID (from search_podcasts or trending podcasts results)',
        },
        max: {
          type: 'number',
          description: 'Maximum number of episodes to return (default 10, max 100)',
        },
        _apiKey: APIKEY_PROP,
      },
      required: ['feed_id'],
    },
  },
  {
    name: 'trending',
    description:
      'Get trending podcasts across the open podcast database, ranked by recent activity. Optionally filter by language or category. Returns podcast title, author, categories, artwork, and trend score. Example: trending({ max: 10, lang: "en", cat: "Technology" })',
    inputSchema: {
      type: 'object',
      properties: {
        max: {
          type: 'number',
          description: 'Maximum number of trending podcasts to return (default 10, max 40)',
        },
        lang: {
          type: 'string',
          description: 'Optional language filter, e.g. "en", "es"',
        },
        cat: {
          type: 'string',
          description: 'Optional category filter, e.g. "Technology", "News"',
        },
        _apiKey: APIKEY_PROP,
      },
      required: [],
    },
  },
];

// SHA-1 of a UTF-8 string → lowercase hex.
async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pcIndexGet(combined: string | undefined, path: string): Promise<unknown> {
  const [key, secret] = (combined || '').split(':');
  if (!key || !secret) {
    return { error: 'api_key_required', message: 'No Podcast Index credentials available (need KEY:SECRET).' };
  }

  const authDate = Math.floor(Date.now() / 1000);
  const authHash = await sha1Hex(key + secret + authDate);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Auth-Key': key,
      'X-Auth-Date': String(authDate),
      Authorization: authHash,
      'User-Agent': 'pipeworx/1.0 (+https://pipeworx.io)',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const combined = args._apiKey as string | undefined;
  delete args._apiKey;

  switch (name) {
    case 'search_podcasts':
      return searchPodcasts(combined, args.query as string, args.max as number | undefined);
    case 'get_podcast':
      return getPodcast(combined, args.feed_id as number);
    case 'episodes':
      return getEpisodes(combined, args.feed_id as number, args.max as number | undefined);
    case 'trending':
      return getTrending(combined, args.max as number | undefined, args.lang as string | undefined, args.cat as string | undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface Feed {
  id: number;
  title: string;
  author: string;
  description?: string;
  url: string;
  link: string;
  ownerName?: string;
  categories?: Record<string, string> | null;
  episodeCount?: number;
  language?: string;
  image: string;
  lastUpdateTime?: number;
  trendScore?: number;
}

interface Episode {
  id: number;
  title: string;
  description?: string;
  datePublished: number;
  duration: number;
  enclosureUrl: string;
  link: string;
  episode?: number;
  season?: number;
}

function categoriesOf(f: Feed): string[] {
  return f.categories ? Object.values(f.categories) : [];
}

async function searchPodcasts(combined: string | undefined, query: string, max?: number) {
  const m = Math.min(max ?? 10, 40);
  const data = (await pcIndexGet(
    combined,
    `/search/byterm?q=${encodeURIComponent(query)}&max=${m}`,
  )) as { feeds?: Feed[]; count?: number; error?: unknown };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const feeds = data.feeds ?? [];
  return {
    count: data.count,
    podcasts: feeds.map((f) => ({
      id: f.id,
      title: f.title,
      author: f.author,
      description: (f.description || '').slice(0, 300),
      url: f.url,
      link: f.link,
      categories: categoriesOf(f),
      episodeCount: f.episodeCount,
      language: f.language,
      image: f.image,
    })),
  };
}

async function getPodcast(combined: string | undefined, feedId: number) {
  const data = (await pcIndexGet(combined, `/podcasts/byfeedid?id=${feedId}`)) as {
    feed?: Feed;
    error?: unknown;
  };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const f = data.feed;
  if (!f) return data;
  return {
    id: f.id,
    title: f.title,
    author: f.author,
    description: (f.description || '').slice(0, 1000),
    url: f.url,
    link: f.link,
    ownerName: f.ownerName,
    episodeCount: f.episodeCount,
    categories: categoriesOf(f),
    language: f.language,
    image: f.image,
    lastUpdateTime: f.lastUpdateTime,
  };
}

async function getEpisodes(combined: string | undefined, feedId: number, max?: number) {
  const m = Math.min(max ?? 10, 100);
  const data = (await pcIndexGet(combined, `/episodes/byfeedid?id=${feedId}&max=${m}`)) as {
    items?: Episode[];
    error?: unknown;
  };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const items = data.items ?? [];
  return {
    episodes: items.map((e) => ({
      id: e.id,
      title: e.title,
      description: (e.description || '').slice(0, 300),
      datePublished: e.datePublished,
      duration: e.duration,
      enclosureUrl: e.enclosureUrl,
      link: e.link,
      episode: e.episode,
      season: e.season,
    })),
  };
}

async function getTrending(combined: string | undefined, max?: number, lang?: string, cat?: string) {
  const m = Math.min(max ?? 10, 40);
  let path = `/podcasts/trending?max=${m}`;
  if (lang) path += `&lang=${encodeURIComponent(lang)}`;
  if (cat) path += `&cat=${encodeURIComponent(cat)}`;

  const data = (await pcIndexGet(combined, path)) as { feeds?: Feed[]; error?: unknown };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const feeds = data.feeds ?? [];
  return feeds.map((f) => ({
    id: f.id,
    title: f.title,
    author: f.author,
    url: f.url,
    categories: categoriesOf(f),
    image: f.image,
    trendScore: f.trendScore,
  }));
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
