/** Plain query (no Next.js caching) so it can be unit-tested against a test database. */
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { housePhotos, houses } from "@/db/schema";

export async function selectPublicHouses(db: Database) {
  return db
    .select({
      slug: houses.slug,
      name: houses.name,
      type: houses.type,
      publicLocation: houses.publicLocation,
      monthlyRent: houses.monthlyRent,
      bedrooms: houses.bedrooms,
      utilities: houses.utilities,
      status: houses.status,
      coverUrl: sql<string | null>`(select ${housePhotos.url} from ${housePhotos} where ${housePhotos.houseId} = "houses"."id" order by ${housePhotos.sortOrder}, ${housePhotos.id} limit 1)`,
    })
    .from(houses)
    .where(and(eq(houses.isPublished, true)))
    .orderBy(asc(houses.sortOrder), asc(houses.id));
}

export type PublicHouseCard = Awaited<ReturnType<typeof selectPublicHouses>>[number];
