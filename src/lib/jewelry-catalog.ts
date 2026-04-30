/**
 * Centralized jewelry product catalog for the AR Try-On experience.
 *
 * Each product defines:
 *  - category:    determines which tracking mode to use (hand vs face)
 *  - trackingMode: "hand" uses HandLandmarker, "face" uses FaceLandmarker
 *  - placement:   specific landmark strategy for overlay positioning
 */

export type JewelryCategory = "ring" | "necklace" | "earring" | "bracelet";
export type TrackingMode = "hand" | "face";
export type PlacementStrategy = "ring-finger" | "neck" | "ears" | "wrist";

export interface JewelryProduct {
  id: string;
  name: string;
  price: string;
  image: string;        // path to product PNG for overlay
  category: JewelryCategory;
  trackingMode: TrackingMode;
  placement: PlacementStrategy;
  tag?: string;
}

export interface CategoryInfo {
  id: JewelryCategory;
  label: string;
  emoji: string;
  trackingMode: TrackingMode;
  camera: "user" | "environment";
  instructions: string[];
  detectedLabel: string;
  waitingLabel: string;
}

/* ------------------------------------------------------------------ */
/*  Category metadata                                                  */
/* ------------------------------------------------------------------ */
export const CATEGORIES: CategoryInfo[] = [
  {
    id: "ring",
    label: "Rings",
    emoji: "💍",
    trackingMode: "hand",
    camera: "environment",
    instructions: [
      "Allow camera access when prompted",
      "Hold your hand in front of the rear camera",
      "The AI will detect your hand & place the ring on your finger",
      "Tap the 📸 button to save a screenshot",
    ],
    detectedLabel: "Hand Detected — Ring Placed",
    waitingLabel: "Show Your Hand",
  },
  {
    id: "necklace",
    label: "Necklaces",
    emoji: "📿",
    trackingMode: "face",
    camera: "user",
    instructions: [
      "Allow camera access when prompted",
      "Look directly at the front camera",
      "The AI will detect your face & place the necklace",
      "Tap the 📸 button to save a screenshot",
    ],
    detectedLabel: "Face Detected — Necklace Placed",
    waitingLabel: "Look at the Camera",
  },
  {
    id: "earring",
    label: "Earrings",
    emoji: "✨",
    trackingMode: "face",
    camera: "user",
    instructions: [
      "Allow camera access when prompted",
      "Face the front camera with both ears visible",
      "The AI will detect your ears & place the earrings",
      "Tap the 📸 button to save a screenshot",
    ],
    detectedLabel: "Face Detected — Earrings Placed",
    waitingLabel: "Look at the Camera",
  },
  {
    id: "bracelet",
    label: "Bracelets",
    emoji: "⌚",
    trackingMode: "hand",
    camera: "environment",
    instructions: [
      "Allow camera access when prompted",
      "Show your wrist in front of the rear camera",
      "The AI will detect your wrist & place the bracelet",
      "Tap the 📸 button to save a screenshot",
    ],
    detectedLabel: "Hand Detected — Bracelet Placed",
    waitingLabel: "Show Your Wrist",
  },
];

/* ------------------------------------------------------------------ */
/*  Product catalogue                                                  */
/* ------------------------------------------------------------------ */
export const PRODUCTS: JewelryProduct[] = [
  // Rings (hand tracking → ring finger)
  {
    id: "ring-diamond",
    name: "Diamond Solitaire",
    price: "$2,450",
    image: "/images/ring-diamond.png",
    category: "ring",
    trackingMode: "hand",
    placement: "ring-finger",
    tag: "Bestseller",
  },
  {
    id: "ring-sapphire",
    name: "Royal Sapphire",
    price: "$3,200",
    image: "/images/ring-sapphire.png",
    category: "ring",
    trackingMode: "hand",
    placement: "ring-finger",
    tag: "Exclusive",
  },

  // Necklaces (face tracking → neck)
  {
    id: "necklace-gold",
    name: "Gold Pendant",
    price: "$1,100",
    image: "/images/necklace-gold.png",
    category: "necklace",
    trackingMode: "face",
    placement: "neck",
    tag: "New",
  },
  {
    id: "necklace-pearl",
    name: "Pearl Strand",
    price: "$680",
    image: "/images/necklace-pearl.png",
    category: "necklace",
    trackingMode: "face",
    placement: "neck",
  },

  // Earrings (face tracking → ears)
  {
    id: "earring-diamond",
    name: "Diamond Drops",
    price: "$1,800",
    image: "/images/earrings-diamond.png",
    category: "earring",
    trackingMode: "face",
    placement: "ears",
    tag: "Limited",
  },
  {
    id: "earring-hoop",
    name: "Gold Hoops",
    price: "$420",
    image: "/images/earrings-hoop.png",
    category: "earring",
    trackingMode: "face",
    placement: "ears",
  },

  // Bracelets (hand tracking → wrist)
  {
    id: "bracelet-gold",
    name: "Charm Link",
    price: "$850",
    image: "/images/bracelet-gold.png",
    category: "bracelet",
    trackingMode: "hand",
    placement: "wrist",
    tag: "AR Ready",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export function getProductsByCategory(category: JewelryCategory): JewelryProduct[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function getCategoryInfo(category: JewelryCategory): CategoryInfo {
  return CATEGORIES.find((c) => c.id === category)!;
}
