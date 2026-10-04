import { preloadQuery } from "convex/nextjs";

import { HomeFeed } from "@/components/podcast/HomeFeed";
import { HomeGreeting } from "@/components/podcast/HomeGreeting";
import { api } from "@/convex/_generated/api";

export default async function Home() {
  const [preloadedTrending, preloadedShows] = await Promise.all([
    preloadQuery(api.podcasts.getTrending, { limit: 8 }),
    preloadQuery(api.shows.getPopular, { limit: 8 }),
  ]);
  return (
    <div className="flex flex-col gap-10">
      <HomeGreeting />
      <HomeFeed
        featured
        preloadedTrending={preloadedTrending}
        preloadedShows={preloadedShows}
      />
    </div>
  );
}
