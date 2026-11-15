import { Home } from "@/components/home";

// The client-side auth provider renders this page only after restoring the session.
export const instant = false;

export default function HomePage() {
  return <Home />;
}
