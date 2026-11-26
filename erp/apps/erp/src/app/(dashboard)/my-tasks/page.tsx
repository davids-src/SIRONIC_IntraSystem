import { redirect } from "next/navigation";

/** "Saját feladataim" merged into Feladatok → Teendőim; old links and bookmarks land there. */
export default function MyTasksPage() {
  redirect("/feladatok");
}
