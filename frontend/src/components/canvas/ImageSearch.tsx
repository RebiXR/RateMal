import { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
//import { searchImages } from "../../api/imageApi";

export default function ImageSearch() {
  const [query, setQuery] = useState("");
  ///const [images, setImages] = useState([]);
  //const { selectedImage, setSelectedImage } = useContext(AppContext);
  const { images, searchImages, selectedImage, setSelectedImage } =
    useContext(AppContext);

  const handleSearch = async () => {
    await searchImages(query);
    
  };
  
  useEffect(() => {
  if (!selectedImage) return;

  searchImages(selectedImage.alt || query);

}, [selectedImage]);



  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Lass dich inspirieren :)"
      />

      <button onClick={handleSearch}>
        Suchen
      </button>

      <div>
        {images.map((img: any) => (
          <img key={img.id} src={img.url} alt={img.alt} width={120}  onClick={() => setSelectedImage(img)}
            style={{
              cursor: "pointer",
              border:
                selectedImage?.id === img.id ? "3px solid blue" : "none",
            }} />
        ))}
      </div>
    </div>
  );
}