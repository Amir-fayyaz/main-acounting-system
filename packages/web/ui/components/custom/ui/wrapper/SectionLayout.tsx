import PagesContainer from "./PagesContainer";
import type { ReactNode } from "react";

function SectionLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`section-layout ${className ? className : ""}`}>
      <PagesContainer>{children}</PagesContainer>
    </section>
  );
}
export default SectionLayout;
