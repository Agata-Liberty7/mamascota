// app/utils/breeds.ts

// ---------------------------
// 🐱 Cat breeds (20)
// ---------------------------
export const CAT_BREEDS = [
  "Abyssinian",
  "Bengal",
  "British Shorthair",
  "Scottish Fold",
  "Maine Coon",
  "Sphynx",
  "Ragdoll",
  "Siamese",
  "Burmese",
  "Devon Rex",
  "Cornish Rex",
  "Norwegian Forest",
  "Persian",
  "Exotic Shorthair",
  "Siberian",
  "Russian Blue",
  "Turkish Angora",
  "Oriental",
  "American Curl",
  "Regular European",
  "Savannah",
  "Metis",        // ← добавлено
];

// ---------------------------
// 🐶 Dog breeds (30)
// ---------------------------
export const DOG_BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "French Bulldog",
  "Poodle",
  "Bulldog",
  "Beagle",
  "Rottweiler",
  "Yorkshire Terrier",
  "Dachshund",
  "Boxer",
  "Corgi",
  "Chihuahua",
  "Shih Tzu",
  "Australian Shepherd",
  "Siberian Husky",
  "Doberman",
  "Pomeranian",
  "Maltese",
  "Great Dane",
  "Border Collie",
  "Cane Corso",
  "Staffordshire Terrier",
  "Jack Russell Terrier",
  "Shiba Inu",
  "Akita Inu",
  "Bichon Frise",
  "Cairn Terrier",
  "Bernese Mountain Dog",
  "Samoyed",
  "Crossbreed",   // ← корректный термин вместо Cruzado
];

// ---------------------------
// 🔗 Mapping: species → breeds
// ---------------------------
export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  cat: CAT_BREEDS,
  dog: DOG_BREEDS,
};
