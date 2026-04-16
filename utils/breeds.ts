// app/utils/breeds.ts

// ---------------------------
// 🐱 Cat breeds (20)
// ---------------------------
export const CAT_BREEDS = [
  "Abyssinian",
  "American Curl",
  "American Shorthair",
  "American Wirehair",
  "Bengal",
  "Birman",
  "Bombay",
  "British Shorthair",
  "Burmese",
  //"Chartreux",
  //"Cornish Rex",
  //"Devon Rex",
  "Egyptian Mau",
  "European Shorthair",
  //"Exotic Shorthair",
  //"Havana Brown",
  "Himalayan",
  "Japanese Bobtail",
  //"Korat",
  //"LaPerm",
  "Maine Coon",
  //"Manx",
  "Munchkin",
  // "Nebelung",
  "Norwegian Forest Cat",
  //"Ocicat",
  "Oriental Shorthair",
  "Persian",
  "Ragdoll",
  "Russian Blue",
  "Scottish Fold",
  "Siamese",
  "Siberian",
  "Singapura",
  //"Snowshoe",
  //"Somali",
  "Sphynx",
  //"Tonkinese",
  "Turkish Angora",
  "Turkish Van",
  "Metis",      // ← добавлено
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
  "Greyhound",
  "Podenco",
  "American Pit Bull Terrier",
  "Crossbreed"   // ← корректный термин вместо Cruzado
];

// ---------------------------
// 🔗 Mapping: species → breeds
// ---------------------------
export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  cat: CAT_BREEDS,
  dog: DOG_BREEDS,
};

// ---------------------------
// 🔁 Breed aliases (UI → YAML)
// ---------------------------

export const DOG_BREED_ALIASES: Record<string, string[]> = {
  "German Shepherd": ["German Shepherd Dog"],
  "Doberman": ["Doberman Pinscher"],
  "Akita Inu": ["Akita"],
  "Staffordshire Terrier": [
    "American Staffordshire Terrier",
    "Staffordshire Bull Terrier",
  ],
  "Poodle": [
    "Poodle (Standard)",
    "Poodle (Miniature)",
    "Poodle (Toy)",
  ],
  "Bulldog": ["English Bulldog"],
};

export const CAT_BREED_ALIASES: Record<string, string[]> = {
  "Norwegian Forest": ["Norwegian Forest Cat"],
  "Oriental": ["Oriental Shorthair"],
};
