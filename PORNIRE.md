# Cum pornești ReelMatch (server + aplicație)

Structura: `server/` (Django + DRF) și `client/` (Expo / React Native). Frontendul vorbește cu backendul doar prin `fetch`, în `client/src/services/`.

## 1. Server
```bash
cd server
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # completează TMDB_API_KEY (și DATABASE_URL de la Neon; fără el folosește SQLite local)
python manage.py migrate
python manage.py sync_movies --genres --providers --country RO   # OBLIGATORIU o dată: genurile și platformele din onboarding
python manage.py runserver 0.0.0.0:8000
```
Fără cheie TMDB poți rula `python manage.py seed_demo` (filme fictive). Verificare: `http://localhost:8000/api/health` și `http://localhost:8000/api/docs/` (Swagger).
Teste: `python manage.py test --settings=reelmatch.settings.test`

## 2. Aplicația
```bash
cd client
cp .env.example .env
npm install
npx expo start
```
În `client/.env` pune adresa serverului:
- telefon real (același Wi-Fi): `EXPO_PUBLIC_API_URL=http://IP-ul-laptopului:8000/api`
- emulator Android: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api`

După ce modifici `.env`, repornește cu `npx expo start -c`.

## 3. Verificare rapidă a fluxului
1. Register → onboarding (alegi minim 3 genuri și 2 platforme) → Home cu filme în tendințe.
2. Create room → lobby cu cod (ex. `K7F-29Q`) → pe alt telefon: „Join with a code" (cont sau doar poreclă).
3. Gazda apasă „Start voting" → toți votează Like / Dislike → rezultate cu % compatibilitate → „Choose this movie".
