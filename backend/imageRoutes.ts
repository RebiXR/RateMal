import express from "express";

const router = express.Router();

router.get("/search-images", async (req, res) => {
  const query = req.query.q as string;

  if (!query) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${query}&per_page=10`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    }

   //Typ anlegen damit kein unknown type error 
  );
  type PexelsResponse = {
  photos: {
    id: number;
    alt: string;
    src: {
      medium: string;
    };
  }[];
};

  const data = await response.json() as PexelsResponse;

  const images = data.photos.map((photo: any) => ({
    id: photo.id,
    url: photo.src.medium,
    alt: photo.alt,
  }));

  res.json(images);
});

export default router;