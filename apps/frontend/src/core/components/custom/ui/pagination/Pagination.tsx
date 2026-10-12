"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/shadcn/ui/pagination/pagination";
import { usePathname, useSearchParams } from "next/navigation";

export function Paginations({
  pagination,
}: {
  pagination?: {
    page: number;
    total: number;
  };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = pagination?.page ?? 1;
  const total = pagination?.total ?? 1;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };
  return (
    <Pagination>
      <PaginationContent className="gap-1">
        <PaginationItem>
          <PaginationPrevious
            size="sm"
            href={page > 1 ? createPageURL(page - 1) : undefined}
            className={`
          ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-blue-50 hover:text-prborder-primary-foreground"}
          border border-gray-200 rounded-lg px-3 py-2
          transition-all duration-200
          text-gray-600
        `}
            aria-label="صفحه قبلی"
          />
        </PaginationItem>

        <>
          <PaginationItem>
            <PaginationLink
              size="sm"
              href={createPageURL(total)}
              className="
            bg-primary text-white hover:bg-accent
            border border-primary-foreground rounded-lg px-4 py-2
            font-medium shadow-sm
            transition-all duration-200
          "
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        </>

        <PaginationItem>
          <PaginationNext
            size="sm"
            href={page < total ? createPageURL(page + 1) : undefined}
            className={`
          ${page >= total ? "pointer-events-none opacity-40" : "hover:bg-blue-50 hover:text-prborder-primary-foreground"}
          border border-gray-200 rounded-lg px-3 py-2
          transition-all duration-200
          text-gray-600
        `}
            aria-label="صفحه بعدی"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
