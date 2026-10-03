import { HomeFeed } from "@/components/podcast/HomeFeed";
import { HomeGreeting } from "@/components/podcast/HomeGreeting";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <HomeGreeting />
      <HomeFeed featured />
    </div>
  );
}
