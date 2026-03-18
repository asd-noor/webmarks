# Webmarks

A minimal Chrome/Brave extension that replaces the new tab page with a clean bookmark manager.

## Features

- **Add bookmarks** from any tab via the extension popup or `Cmd+.` / `Ctrl+.`
- **Pin** important bookmarks to keep them at the top
- **Tags** for lightweight organisation
- **Filter** bookmarks by title and/or tags in one unified search bar
- **Edit** any bookmark inline
- **Export to Browser** — saves all bookmarks into a `Webmarks` folder in the bookmarks bar (replaces the folder if it already exists)
- **Export JSON** — download all bookmarks as a `.json` file
- **Import JSON** — restore or sync bookmarks from a previously exported file

## Filter syntax

The filter bar accepts free-form queries. Tokens are space-separated and all must match (AND logic).

| Token | Matches |
|-------|---------|
| `word` | Bookmarks whose **title** contains `word` |
| `#tag` | Bookmarks that have a **tag** containing `tag` |
| `#!` | Bookmarks with **no tags** |

Examples:

- `react` — title contains "react"
- `#react` — has a tag containing "react"
- `#react #css` — has both a "react" tag and a "css" tag
- `my project #react` — title contains "my" and "project", and has a "react" tag
- `#!` — untagged bookmarks only

## Command bar

The same search bar doubles as a command bar. Suggestions appear as you type; press `Enter` to act.

| Prefix | Example | Action |
|--------|---------|--------|
| `/ ` | `/ github` | Search browser history — shows a suggestion dropdown |
| `> ` | `> dns` | Browse `chrome://` internal pages — shows a suggestion dropdown |
| `!` | `!gh opencode` | DuckDuckGo bang search |
| `: ` | `: google.com` | Navigate to a URL (prepends `https://` if no protocol) |
| `: ` | `: /Users/noor/file.txt` | Open a local file (prepends `file://` for `/` paths) |
| `: ` | `: file:///path/to/file` | Navigate to any explicit URL scheme |

For `/ ` and `> `, use `↑`/`↓` to navigate suggestions, `Enter` to open, `Esc` to dismiss.

## License

MIT — see [LICENSE](LICENSE)
