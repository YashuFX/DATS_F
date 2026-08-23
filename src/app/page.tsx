import { redirect } from "next/navigation";

/**
 * There is no home page.
 *
 * The application is four consoles and a settings screen; a landing page in
 * front of them was one click of nothing on every visit. `/` now sends you
 * straight to the array monitor, which is also where sign-in lands, so the two
 * routes into the application agree.
 *
 * Kept as a redirect rather than deleted so existing links, bookmarks and the
 * post-sign-out return path all still resolve instead of 404ing.
 */
export default function RootPage() {
  redirect("/monitor/array");
}
