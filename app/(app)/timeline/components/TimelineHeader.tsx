type TimelineHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function TimelineHeader({
  title = "Timeline",
  subtitle = "The story of your memories — newest first.",
}: TimelineHeaderProps) {
  return (
    <header>
      <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
        {title}
      </h1>

      <p className="mt-1.5 text-sm text-charcoal-muted md:text-base">
        {subtitle}
      </p>
    </header>
  );
}
