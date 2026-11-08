/**
 * Business settings for the website and dashboard.
 *
 * To use this for real (or for another landlord), edit the values below.
 * Houses, tenants and rents are NOT here: they live in the database and are
 * edited in the owner dashboard (starting data comes from /seed).
 */
export const siteConfig = {
  /** Shown in the header, page titles and footer. */
  businessName: "5A Rentals",
  /** The "5A" plaque used as the logo. */
  logoText: "5A",
  /** Short line about who runs it (footer). */
  aboutLine: "Run by the Bañas family.",
  /** One line under the headline on the home page. */
  tagline: "Clean, well-kept houses for rent, managed directly by our family.",

  /** Home page hero. (Placeholder photo until the family's real photos arrive.) */
  hero: {
    title: "Small family houses for rent",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/1439Palumlum%2C_Alfonso%2C_Cavite_20.jpg/960px-1439Palumlum%2C_Alfonso%2C_Cavite_20.jpg",
  },

  location: {
    /** Used in the home page headline: "Houses for rent in …" */
    city: "Dasmariñas City",
    province: "Cavite",
    /** The landmark the houses are near. */
    nearLandmark: "Dasmariñas West National High School",
    /** Short form for tight spots (location strip, hero line). */
    nearLandmarkShort: "Dasmariñas West NHS",
    /** Places one jeep ride away (the "One jeep ride away" signboards). */
    oneRideTo: [
      { name: "WalterMart", note: "Mall and groceries" },
      { name: "Bayan", note: "Town proper and public market" },
      { name: "EAC", note: "Emilio Aguinaldo College" },
      { name: "Hospital", note: "Medical care" },
    ],
  },

  /** "Questions" on the home page. */
  faq: [
    { q: "How much to move in?", a: "1 month advance + 1 month deposit." },
    { q: "Water and electricity?", a: 'Not included. Each house shows "Own meter" or "Shared".' },
    { q: "Parking?", a: "Motorcycles only." },
    { q: "House rules", a: "Quiet hours 10 PM to 6 AM. Rent on or before the due date." },
  ],

  contact: {
    /** Mobile number for the Call / Text buttons. (Placeholder) */
    phone: "0900 000 0000",
    /** Optional public email. Leave empty to hide it. */
    email: "",
    /** Full Facebook page link. (Placeholder) */
    facebookPageUrl: "https://www.facebook.com/your-page",
    /** The page's username, used for the Messenger button: m.me/<username>. (Placeholder) */
    messengerUsername: "your-page",
    /** When the family usually replies, shown near the inquiry form. */
    replyTime: "We usually reply within the day.",
  },

  currency: { code: "PHP", locale: "en-PH" },
  timeZone: "Asia/Manila",

  reminders: {
    /** Unpaid rent shows as "due soon" this many days before its due date. */
    rentDueSoonDays: 5,
    /** A lease shows as "ending soon" this many days before it ends. */
    leaseEndingSoonDays: 60,
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function messengerUrl(): string {
  return `https://m.me/${siteConfig.contact.messengerUsername}`;
}
