# Remy avatar artwork — Blueprint Sprite Sheet

`RemyAvatar` renders Remy by cropping regions from **one** image:

```
public/remy/remy-blueprint.png
```

Drop the official **Remy Avatar Blueprint** here as `remy-blueprint.png`. No code
change is required — every mood is a crop region of this single sheet, defined in
`components/remy/avatar/remy-sprite-map.ts`.

## Mood → blueprint region

| Mood          | Blueprint sprite                       |
| ------------- | -------------------------------------- |
| `welcoming`   | In-App Usage → Chatting bust           |
| `listening`   | In-App Usage → Listening               |
| `thinking`    | In-App Usage → Thinking                |
| `analyzing`   | In-App Usage → Analyzing               |
| `sharing`     | In-App Usage → Sharing                 |
| `celebrating` | In-App Usage → Celebrating             |
| `reflecting`  | Expressions → Thoughtful (wing to chin)|
| `resting`     | Poses & Actions → Resting (eyes closed)|
| `neutral`     | Expressions → Neutral                  |

## Notes

- Crop regions are **normalized fractions** (0–1) of the image, so any resolution
  works. Recalibrate in `remy-sprite-map.ts` if the export's framing differs.
- Until `remy-blueprint.png` is present, avatars show a brand fallback (Remy's
  purple with the gold heart pendant) — never an emoji.
- Adding/updating Remy = replace this one file (or tweak the sprite map).
