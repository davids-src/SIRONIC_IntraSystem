import { DEFAULT_ICON_DATA_URI } from "./default-icon";

type PwaIconMarkupProps = {
  size: number;
  /** Custom icon (data URI or absolute URL) from Admin > Arculat; unset = the built-in mark. */
  customSrc?: string;
};

/**
 * Home-screen / PWA tile for the generated PNG responses. A custom icon is drawn full-bleed (the
 * admin uploads a finished square icon); the built-in SIRONIC mark sits on a white tile inside the
 * maskable safe zone, so Android's circular / squircle masks never clip it.
 */
export function PwaIconMarkup({ size, customSrc }: PwaIconMarkupProps) {
  if (customSrc) {
    return (
      <div style={{ width: size, height: size, display: "flex" }}>
        <img
          src={customSrc}
          width={size}
          height={size}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  }

  const mark = Math.round(size * 0.7);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <img src={DEFAULT_ICON_DATA_URI} width={mark} height={mark} alt="" />
    </div>
  );
}
