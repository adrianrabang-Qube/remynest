interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  id?: string;

  hidden?: boolean;
}

export default function ProfileSection({
  title,
  children,
  hidden = false,
  id,
}: ProfileSectionProps) {
  if (hidden) {
    return null;
  }

  return (
    <section
      id={id}
      className="space-y-3 scroll-mt-24"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h4>

      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}