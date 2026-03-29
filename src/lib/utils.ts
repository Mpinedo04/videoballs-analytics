import { compareTwoStrings } from 'string-similarity';

/**
 * Checks if two video titles match based on fuzzy string similarity and published time.
 * @param title1 Title of the first video
 * @param title2 Title of the second video
 * @param date1 Published date of the first video
 * @param date2 Published date of the second video
 * @returns boolean
 */
export const isVideoMatch = (
  title1: string,
  title2: string,
  date1: Date,
  date2: Date
): boolean => {
  // 1. EARLY RETURN O(1): Ventana de ±24 horas para captar subidas asíncronas
  const timeDiff = Math.abs(date1.getTime() - date2.getTime());
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  // Si se publicaron con más de 24h de diferencia, omitimos la matemática asfixiante de la CPU y abortamos.
  if (timeDiff > twentyFourHours) return false;

  // 2. Normalize titles: lowercase, remove special characters, trim
  const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  const score = compareTwoStrings(normalize(title1), normalize(title2));
  
  // Umbral de similitud (0.75) para mayor flexibilidad
  return score > 0.75;
};

/**
 * Group videos based on title and time similarity.
 */
export const groupVideos = (videos: any[]) => {
  const groups: Record<string, string> = {};
  
  for (let i = 0; i < videos.length; i++) {
    if (videos[i].group_id) continue;
    
    const groupId = crypto.randomUUID();
    videos[i].group_id = groupId;
    
    for (let j = i + 1; j < videos.length; j++) {
      if (videos[j].group_id) continue;
      
      if (isVideoMatch(
        videos[i].title, 
        videos[j].title, 
        new Date(videos[i].published_at), 
        new Date(videos[j].published_at)
      )) {
        videos[j].group_id = groupId;
      }
    }
  }
  return videos;
};
