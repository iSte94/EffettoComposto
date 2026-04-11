import Image from "next/image";
import Link from "next/link";
import fullLogo from "../../public/logo grande effetto composto.png";
import { cn } from "@/lib/utils";

const FULL_LOGO_WIDTH = 1536;
const FULL_LOGO_HEIGHT = 1024;
const WORDMARK_X = 215;
const WORDMARK_Y = 295;
const WORDMARK_WIDTH = 1096;
const WORDMARK_HEIGHT = 356;

const wordmarkScale = FULL_LOGO_WIDTH / WORDMARK_WIDTH;
const wordmarkOffsetX = WORDMARK_X / FULL_LOGO_WIDTH;
const wordmarkOffsetY = WORDMARK_Y / FULL_LOGO_HEIGHT;

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
      <div
        className={cn("relative w-full overflow-hidden", imageClassName)}
        style={{ aspectRatio: `${WORDMARK_WIDTH} / ${WORDMARK_HEIGHT}` }}
      >
        <Image
          src={fullLogo}
          alt="Effetto Composto"
          priority={priority}
          sizes="(max-width: 768px) 14rem, 24rem"
          className="absolute left-0 top-0 h-auto max-w-none"
          style={{
            width: `${wordmarkScale * 100}%`,
            transform: `translate(-${wordmarkOffsetX * 100}%, -${wordmarkOffsetY * 100}%)`,
          }}
        />
      </div>
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
