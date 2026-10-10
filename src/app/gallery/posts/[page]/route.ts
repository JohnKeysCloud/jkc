import { getPageCount, getPostPage } from "@/lib/instagramContent";

// Every page is built with the site; anything else is a 404.
export const dynamicParams = false;

/** Page 1 ships inside the gallery's HTML, so the JSON starts at page 2. */
export function generateStaticParams() {
  return Array.from({ length: getPageCount() - 1 }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  return Response.json(getPostPage(Number(page)));
}
