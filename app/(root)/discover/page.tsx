import { preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { HomeFeed } from "@/components/podcast/HomeFeed";
import { Searchbar } from "@/components/search/Searchbar";
import { SearchResults } from "@/components/search/SearchResults";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = { title: "Descubrir" };

export default async function DiscoverPage({
  searchParams,
}: PageProps<"/discover">) {
  const { search } = await searchParams;
  const term = typeof search === "string" ? search.trim().slice(0, 100) : "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader as="h1" title="Descubrir" />
      <Searchbar search={term} />
      {term ? (
        <SearchResults term={term} />
      ) : (
        <HomeFeed
          preloadedTrending={await preloadQuery(api.podcasts.getTrending, {
            limit: 12,
          })}
          trendingTitle="Populares"
          latestTitle="Todos los podcasts"
        />
      )}
    </div>
  );
}
