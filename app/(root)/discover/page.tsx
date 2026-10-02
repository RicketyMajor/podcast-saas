import { HomeFeed } from "@/components/podcast/HomeFeed";
import { Searchbar } from "@/components/search/Searchbar";
import { SearchResults } from "@/components/search/SearchResults";
import { SectionHeader } from "@/components/shared/SectionHeader";

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
          trendingTitle="Populares"
          latestTitle="Todos los podcasts"
          trendingLimit={12}
        />
      )}
    </div>
  );
}
