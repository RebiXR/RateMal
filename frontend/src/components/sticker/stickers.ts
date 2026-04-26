import { Sticker } from "lucide-react";

export interface Sticker {
  id: string;
  label: string;
  icon: string;
  isImage?: boolean;
}


export const STICKER_CATEGORIES:  Record<string,Sticker[]> = {
  Formen: [
    { id: 'blob', label: 'Fleck', icon: '💧' },
    { id: 'star', label: 'Stern', icon: '⭐' },
  ],
  Natur: [
    { id: 'sun', label: 'Sonne', icon: '☀️' },
    { id: 'tree', label: 'Baum', icon: '🌲' },
    { id: 'tree2', label: 'Baum2', icon: '/sticker/tree.png', isImage: true },
    { id: 'leaves', label: 'leaves', icon: '/sticker/buntysmum-leaves.png', isImage: true },
    { id: 'cherry', label: 'cherry', icon: '/sticker/cherry.png' , isImage: true},
    { id: 'flower1', label: 'flower', icon: '/sticker/4383982.png' , isImage: true},
    { id: 'flower2', label: 'flower', icon: '/sticker/4645828.png' , isImage: true},
    { id: 'plant1', label: 'plant', icon: '/sticker/plant1.png' , isImage: true},
  ],
  Tiere: [
    { id: 'cat', label: 'Katze', icon: '🐱' },
    { id: 'bird', label: 'vogel', icon: '/sticker/bird.png' , isImage: true},
    { id: 'panda', label: 'panda', icon: '/sticker/panda.png' , isImage: true},
    
  ],
  Collage: [
    { id: 'test', label: 'test', icon: '/sticker/photo.avif' , isImage: true},
    
  ]
};



