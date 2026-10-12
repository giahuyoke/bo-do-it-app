interface ItemTitleProps {
  title: string;
  completed?: boolean;
  className?: string;
}

export function ItemTitle({ title, completed = false, className = "" }: ItemTitleProps) {
  return completed ? (
    <s className={`planner-completed-title ${className}`}>{title}</s>
  ) : (
    <span className={className}>{title}</span>
  );
}
