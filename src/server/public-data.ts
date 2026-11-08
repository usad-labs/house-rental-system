/**
 * The ONLY data the public website may read: listing fields of published houses.
 * Never select tenant, payment or address data here.
 */
import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { housePhotos, houses } from "@/db/schema";
import { selectPublicHouses } from "./public-queries";

export const HOUSES_TAG = "houses";

export async function getPublicHouses() {
  "use cache";
  cacheTag(HOUSES_TAG);
  cacheLife("hours");
  return selectPublicHouses(db);
}

export async function getPublicHouse(slug: string) {
  "use cache";
  cacheTag(HOUSES_TAG);
  cacheLife("hours");
  const [house] = await db
    .select({
      id: houses.id,
      slug: houses.slug,
      name: houses.name,
      type: houses.type,
      publicLocation: houses.publicLocation,
      monthlyRent: houses.monthlyRent,
      bedrooms: houses.bedrooms,
      bathrooms: houses.bathrooms,
      floorAreaSqm: houses.floorAreaSqm,
      utilities: houses.utilities,
      description: houses.description,
      features: houses.features,
      terms: houses.terms,
      status: houses.status,
      mapUrl: houses.mapUrl,
    })
    .from(houses)
    .where(and(eq(houses.slug, slug), eq(houses.isPublished, true)))
    .limit(1);
  if (!house) return null;
  const photos = await db
    .select({ url: housePhotos.url, alt: housePhotos.alt })
    .from(housePhotos)
    .where(eq(housePhotos.houseId, house.id))
    .orderBy(asc(housePhotos.sortOrder), asc(housePhotos.id));
  return { ...house, photos };
}
