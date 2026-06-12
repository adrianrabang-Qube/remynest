# Remy avatar artwork

`RemyAvatar` renders Remy's real artwork from this folder. Add the official
exports from the **Remy Avatar Blueprint** here — no code change is required.

## Files (one PNG per mood)

| File                    | Blueprint state          |
| ----------------------- | ------------------------ |
| `remy-welcoming.png`    | Chatting (greeting)      |
| `remy-listening.png`    | Listening                |
| `remy-thinking.png`     | Thinking                 |
| `remy-analyzing.png`    | Analyzing                |
| `remy-reflecting.png`   | Thoughtful (wing to chin)|
| `remy-sharing.png`      | Sharing                  |
| `remy-celebrating.png`  | Celebrating              |
| `remy-resting.png`      | Resting (eyes closed)    |
| `remy-neutral.png`      | Neutral                  |

## Spec

- Square **bust crop** of Remy (head + scarf + heart pendant), centered.
- **Transparent** background.
- ~512×512 px (any square size works; rendered with `object-cover`).
- Cropped from the corresponding blueprint sprite — do **not** redesign Remy.

Until a file is present, that mood renders a brand fallback (Remy's purple with
the gold heart pendant). Drop the PNGs in and the real art appears everywhere
`RemyAvatar` is mounted, with a smooth crossfade between moods.
