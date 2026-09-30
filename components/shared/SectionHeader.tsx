export function SectionHeader({
  title,
  as: Heading = "h2",
  action,
}: {
  title: string;
  as?: "h1" | "h2";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Heading
        className={
          Heading === "h1"
            ? "text-[1.75rem] font-bold tracking-tight text-balance"
            : "text-[1.375rem] font-semibold tracking-tight text-balance"
        }
      >
        {title}
      </Heading>
      {action}
    </div>
  );
}
