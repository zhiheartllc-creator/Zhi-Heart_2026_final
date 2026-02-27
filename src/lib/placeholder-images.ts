export interface PlaceHolderImage {
  id: string;
  imageUrl: string;
  description: string;
  imageHint: string;
}

export const PlaceHolderImages: PlaceHolderImage[] = [
  {
    id: 'hero',
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=2000&auto=format&fit=crop',
    description: 'Paisaje relajante de naturaleza',
    imageHint: 'Calm, peaceful nature scene'
  },
  {
    id: 'chat-header',
    imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2000&auto=format&fit=crop',
    description: 'Fondo suave para el chat',
    imageHint: 'Soft abstract gradient background'
  },
  {
    id: 'mood-happy',
    imageUrl: 'https://images.unsplash.com/photo-1534080556271-92e106dfdbab?q=80&w=500&auto=format&fit=crop',
    description: 'Feliz',
    imageHint: 'Happy'
  },
  {
    id: 'mood-neutral',
    imageUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=500&auto=format&fit=crop',
    description: 'Normal',
    imageHint: 'Neutral'
  },
  {
    id: 'mood-sad',
    imageUrl: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?q=80&w=500&auto=format&fit=crop',
    description: 'Triste',
    imageHint: 'Sad'
  },
  {
    id: 'mood-anxious',
    imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621bf272d8a?q=80&w=500&auto=format&fit=crop',
    description: 'Ansioso',
    imageHint: 'Anxious'
  },
  {
    id: 'mood-angry',
    imageUrl: 'https://images.unsplash.com/photo-1506544777-622f6762eb29?q=80&w=500&auto=format&fit=crop',
    description: 'Enojado',
    imageHint: 'Angry'
  },
  {
    id: 'mood-worried',
    imageUrl: 'https://images.unsplash.com/photo-1508247164964-b52db03eec08?q=80&w=500&auto=format&fit=crop',
    description: 'Preocupado',
    imageHint: 'Worried'
  }
];