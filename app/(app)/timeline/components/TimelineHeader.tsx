type TimelineHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function TimelineHeader({
  title = "AI Timeline",
  subtitle = "Your memories organized intelligently.",
}: TimelineHeaderProps) {
  return (
    <div>
      <h1 className="text-5xl font-bold text-gray-900 max-md:text-2xl">
        {title}
      </h1>

      <p className="text-gray-500 mt-3 text-lg max-md:mt-1 max-md:text-sm">
        {subtitle}
      </p>
    </div>
  );
}