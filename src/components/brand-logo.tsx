import Image from "next/image";
import Link from "next/link";
import fullLogo from "../../public/logo grande effetto composto.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  href?: string;
  imageClassName?: string;
  priority?: boolean;
  subtitle?: string;
  subtitleClassName?: string;
};

export function BrandLogo({
  className,
  href,
  imageClassName,
  priority = false,
  subtitle,
  subtitleClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <Image
        src={fullLogo}
        alt="Effetto Composto"
        priority={priority}
        className={cn("h-auto w-full", imageClassName)}
      />
      {subtitle ? (
        <p
          className={cn(
            "pl-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground",
            subtitleClassName,
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Vai alla home di Effetto Composto"
        className={cn("inline-flex max-w-full flex-col gap-2", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("inline-flex max-w-full flex-col gap-2", className)}>{content}</div>;
}
