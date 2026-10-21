"use client";
import { Input } from "@/components/shadcn/ui/input/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

function SearchInput({
  title = "جستجو بر اساس خدمت",
  dely = 300,
}: {
  title?: string;
  dely?: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    const nextUrl = `${pathname}?${params.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;

    if (nextUrl !== currentUrl) {
      replace(nextUrl);
    }
  }, dely);
  return (
    <Input
      placeholder={title}
      defaultValue={searchParams.get("search") ?? ""}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}

export default SearchInput;
