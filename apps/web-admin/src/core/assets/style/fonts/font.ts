import localFont from "next/font/local";

export const rubik = localFont({
  src: [
    {
      path: "../fonts/Rubik-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Rubik-Medium.ttf",
      weight: "500",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-rubik",
});
