import { remySpriteStyle } from "./remy-sprite-map";
import type { RemyMood } from "./remy-moods";

/**
 * RemyAvatarSprite — renders a single mood by cropping its region from the one
 * Remy Blueprint sprite sheet (pure CSS background crop). Fills its parent;
 * sizing/animation/ring are handled by RemyAvatar.
 */
export default function RemyAvatarSprite({
  mood,
  className = "",
}: {
  mood: RemyMood;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
      style={remySpriteStyle(mood)}
    />
  );
}
