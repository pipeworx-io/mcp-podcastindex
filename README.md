# mcp-podcastindex

Podcast Index MCP — wraps the Podcast Index API (podcastindex.org)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_podcasts` | Podcast search by term. Find podcasts in the open podcast database by name or keyword. Returns matching podcasts with title, author, description, categories, episode count, and artwork. Example: search_podcasts({ query: "true crime", max: 10 }) |
| `get_podcast` | Get full metadata for a single podcast by its Podcast Index feed ID. Returns title, author, description, owner, episode count, categories, language, and artwork. Example: get_podcast({ feed_id: 920666 }) |
| `episodes` | List recent episodes for a podcast by its Podcast Index feed ID. Returns episode title, description, publish date, duration, audio URL, and episode/season numbers. Example: episodes({ feed_id: 920666, max: 10 }) |
| `trending` | Get trending podcasts across the open podcast database, ranked by recent activity. Optionally filter by language or category. Returns podcast title, author, categories, artwork, and trend score. Example: trending({ max: 10, lang: "en", cat: "Technology" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "podcastindex": {
      "url": "https://gateway.pipeworx.io/podcastindex/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Podcastindex data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
