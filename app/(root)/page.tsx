import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";

import { HomeFeed } from "@/components/podcast/HomeFeed";
import { HomeGreeting } from "@/components/podcast/HomeGreeting";
import { api } from "@/convex/_generated/api";

export default async function Home() {
  // With the session, so accounts hidden by a block never flash in.
  const options = { token: await convexAuthNextjsToken() };
  const [preloadedTrending, preloadedShows, preloadedFollowing] =
    await Promise.all([
      preloadQuery(api.podcasts.getTrending, { limit: 8 }, options),
      preloadQuery(api.shows.getPopular, { limit: 8 }, options),
      preloadQuery(api.podcasts.getFromFollowing, { limit: 8 }, options),
    ]);
  return (
    <div className="flex flex-col gap-10">
      <HomeGreeting />
      <HomeFeed
        featured
        preloadedTrending={preloadedTrending}
        preloadedShows={preloadedShows}
        preloadedFollowing={preloadedFollowing}
      />
    </div>
  );
}
