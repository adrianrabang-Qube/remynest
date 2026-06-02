type Props = {
  title?: string;
  description?: string;
};

export function WorkspaceEmptyState({
  title = "Nothing selected",
  description = "Select or create a workspace to continue.",
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}