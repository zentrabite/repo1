import type { Metadata, Viewport } from "next";
import PublicNotFound, { PUBLIC_NOT_FOUND_BG, publicLinkStyle } from "@/components/public-not-found";

// Shown for name.zentrabite.com addresses that don't belong to a business.
// When the page calls notFound(), Next can take the title and browser bar
// colour from this file instead of the page, so both say the same thing.
// Without them the tab showed the CRM's title.
export const metadata: Metadata = {
  title: "Page not found",
  description: "This address isn't linked to a restaurant.",
};

export const viewport: Viewport = { themeColor: PUBLIC_NOT_FOUND_BG };

export default function SiteNotFound() {
  return (
    <PublicNotFound title="Nothing here yet">
      This address isn&apos;t linked to a restaurant. Check the link, or visit{" "}
      <a href="https://zentrabite.com" style={publicLinkStyle}>zentrabite.com</a>.
    </PublicNotFound>
  );
}
