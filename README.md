# Webmarks

A minimal Chrome/Brave extension that replaces the new tab page with a clean bookmark manager.

## Features

- **Add bookmarks** from any tab via the extension popup or `Cmd+.` / `Ctrl+.`
- **Pin** important bookmarks to keep them at the top
- **Tags** for lightweight organisation, with an untagged filter
- **Search** bookmarks instantly by title or tag
- **Edit** any bookmark inline
- **Export to Browser** — saves all bookmarks into a `Webmarks` folder in the bookmarks bar (replaces the folder if it already exists)
- **Export JSON** — download all bookmarks as a `.json` file
- **Import JSON** — restore or sync bookmarks from a previously exported file

## Search bar modes

The search bar doubles as a command bar. Suggestions appear as you type; press `Enter` to act on the input.

| Prefix | Example | Action |
|--------|---------|--------|
| _(none)_ | `opencode` | Filter bookmarks by title or tag |
| `/ ` | `/ github` | Search browser history — shows a suggestion dropdown |
| `> ` | `> dns` | Browse `chrome://` internal pages — shows a suggestion dropdown |
| `! ` | `!gh opencode` | DuckDuckGo bang search |
| `: ` | `: google.com` | Navigate to a URL (prepends `https://` if no protocol) |
| `: ` | `: /Users/noor/file.txt` | Open a local file (prepends `file://` for `/` paths) |
| `: ` | `: file:///path/to/file` | Navigate to any explicit URL scheme (`file://`, `ftp://`, etc.) |

For the `/ ` and `> ` modes, use `↑`/`↓` to navigate suggestions, `Enter` to open, and `Esc` to dismiss.

## License

MIT — see [LICENSE](LICENSE)
