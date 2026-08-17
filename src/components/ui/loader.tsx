import { cn } from "@/lib/utils";

interface LoaderProps {
  /** Optional text to display below the spinner */
  text?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-[2px]",
  md: "h-6 w-6 border-[2.5px]",
  lg: "h-8 w-8 border-[3px]",
};

/**
 * Unified loading spinner component used across the entire app.
 * Renders a spinning circle with an optional descriptive text below it.
 */
export function Loader({ text, size = "md", className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-blue-600",
          sizeMap[size]
        )}
      />
      {text && (
        <p className="text-xs font-medium text-slate-400 tracking-wide">{text}</p>
      )}
    </div>
  );
}

/**
 * A loader wrapped in a table row — drop-in replacement for all
 * `<tr><td colSpan={N}>Loading…</td></tr>` patterns.
 */
export function TableLoader({
  colSpan,
  text,
}: {
  colSpan: number;
  text?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8">
        <Loader text={text} className="py-2" />
      </td>
    </tr>
  );
}

/**
 * Inline spinner for buttons — replaces the SVG spinner pattern.
 * Use inside a button alongside its label text.
 */
export function ButtonSpinner() {
  return (
    <div
      className="animate-spin h-4 w-4 rounded-full border-[2px] border-white/30 border-t-white mr-2"
    />
  );
}
