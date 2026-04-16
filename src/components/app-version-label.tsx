import { APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

type AppVersionLabelProps = {
  className?: string;
};

export function AppVersionLabel({ className }: AppVersionLabelProps) {
  return (
    <p
      className={cn(
        "pl-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70",
        className,
      )}
      aria-label={`Versione software corrente ${APP_VERSION_LABEL}`}
      title={`Versione software corrente ${APP_VERSION_LABEL}`}
    >
      {APP_VERSION_LABEL}
    </p>
  );
}
