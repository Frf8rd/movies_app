// URL-ul serverului vine din .env (EXPO_PUBLIC_API_URL), nu se scrie în cod.
// Ex: EXPO_PUBLIC_API_URL=http://192.168.1.15:8000/api
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');

// Imagini TMDB (serverul poate returna fie URL complet, fie doar poster_path)
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';
