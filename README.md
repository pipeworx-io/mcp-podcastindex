# mcp-podcastindex

Podcast Index MCP — wraps the Podcast Index API (podcastindex.org)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/podcastindex/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Podcastindex data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
