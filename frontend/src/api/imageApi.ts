export const searchImages = async (query: string) => {
  const res = await fetch(
    `http://localhost:3000/search-images?q=${query}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch images");
  }

  return await res.json();
};