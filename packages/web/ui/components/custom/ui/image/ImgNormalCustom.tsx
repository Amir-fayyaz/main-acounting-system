import Image, { ImageProps } from "next/image";

type ImageNormalCustomProps = ImageProps & {
  src?: string;
  alt?: string;
  className?: string;
  preload?: boolean;
  loading?: "lazy" | "eager";
};

function ImgNormalCustom({
  src = "/placeholder.svg",
  alt = "defult alt",
  className,
  preload = false,
  loading,
  width,
  height,
  ...rest
}: ImageNormalCustomProps) {
  if (!src) {
    return null;
  }
  const finalLoading = loading ?? (preload ? "eager" : "lazy");
  const placeholder = rest.blurDataURL ? "blur" : "empty";
  const isLocalOrBlob =
    src.startsWith("blob:") || src.includes("localhost") || src.startsWith("/");
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      placeholder={placeholder}
      width={width}
      height={height}
      unoptimized={isLocalOrBlob}
      {...rest}
      loading={finalLoading}
    />
  );
}

export { ImgNormalCustom };
