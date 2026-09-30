import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import { getCatalogScores } from "@/lib/scores";
import ExploreList from "./ExploreList";

export const revalidate = 600;

export const metadata = { title: "Explore · Travela" };

export default async function ExplorePage() {
  const scores = await getCatalogScores();
  return (
    <>
      <AppHeader title="Explore" subtitle="Philippine destinations, with estimated tourism pressure" />
      <div className="px-4">
        <SearchBar />
      </div>
      <ExploreList scores={Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.score]))} />
    </>
  );
}
