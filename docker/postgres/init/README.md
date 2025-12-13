# PostgreSQL Initialization Scripts

Ces scripts SQL sont exécutés automatiquement lors de la création du conteneur PostgreSQL, dans l'ordre alphabétique.

## Scripts d'initialisation

### 01-init-extensions.sql
**Objectif**: Activer les extensions PostgreSQL nécessaires

**Extensions activées**:
- `postgis` - Support géospatial (FR-008, FR-020)
- `postgis_topology` - Topologie spatiale
- `uuid-ossp` - Génération d'UUIDs
- `pg_trgm` - Recherche full-text optimisée
- `unaccent` - Recherche insensible aux accents
- `btree_gin` - Index composés optimisés

**Quand**: Au premier démarrage du conteneur

### 02-create-quartiers.sql
**Objectif**: Documentation des quartiers de Conakry

**Contenu**:
- Liste de référence des 5 communes
- Liste des quartiers principaux
- Note: Les données réelles sont insérées par Laravel DatabaseSeeder

**Quartiers par commune**:
1. **KALOUM** - Almamya, Boulbinet, Coronthie, Manquepas, etc.
2. **DIXINN** - Hamdallaye, Cameroun, Kipé, Lambandji, etc.
3. **MATAM** - Matam Centre, Donka, Taouyah, Tombo, etc.
4. **MATOTO** - Cosa, Koloma, Yimbaya, Kagbélen, Sonfonia, etc.
5. **RATOMA** - Ratoma Centre, Kaporo Rails, Dar Es Salam, etc.

### 03-performance-tuning.sql
**Objectif**: Optimiser PostgreSQL pour la charge de production

**Optimisations**:
- `default_statistics_target = 100` - Meilleur planning de requêtes
- `work_mem = 16MB` - Mémoire pour queries complexes
- `maintenance_work_mem = 256MB` - VACUUM et CREATE INDEX
- `auto_explain.log_min_duration = 2000ms` - Log des requêtes lentes
- `random_page_cost = 1.1` - Optimisé pour SSD
- `max_parallel_workers_per_gather = 4` - Queries parallèles
- `effective_cache_size = 2GB` - Cache OS
- `timezone = Africa/Conakry` - Fuseau horaire GMT

### 04-functions.sql
**Objectif**: Créer des fonctions SQL personnalisées

**Fonctions créées**:

1. `calculate_distance(lat1, lon1, lat2, lon2)` → DOUBLE PRECISION
   - Calcule la distance en mètres entre deux points GPS
   - Utilise ST_Distance avec geography

2. `find_listings_in_radius(lat, lon, radius_meters)` → TABLE
   - Trouve toutes les annonces dans un rayon donné (FR-020)
   - Retourne (listing_id, distance_meters)
   - Trié par distance

3. `clean_expired_listings()` → INTEGER
   - Marque les annonces expirées après 90 jours (FR-014)
   - Retourne le nombre d'annonces expirées

4. `increment_listing_views(listing_uuid)` → VOID
   - Incrémente atomiquement le compteur de vues
   - Thread-safe

5. `increment_listing_contacts(listing_uuid)` → VOID
   - Incrémente atomiquement le compteur de contacts
   - Thread-safe

6. `calculate_user_rating(user_uuid)` → NUMERIC(3, 2)
   - Calcule la note moyenne d'un utilisateur
   - Uniquement les ratings validés

7. `get_quartier_from_coords(lat, lon)` → VARCHAR(100)
   - Géocodage inversé pour trouver le quartier
   - Utilise la distance PostGIS au polygone le plus proche

## Ordre d'exécution

Les scripts sont exécutés dans l'ordre numérique:
1. Extensions → 2. Quartiers → 3. Performance → 4. Functions

## Vérification

Pour vérifier que tout est bien configuré:

```sql
-- Vérifier les extensions
SELECT extname, extversion FROM pg_extension;

-- Vérifier les fonctions
\df calculate_distance
\df find_listings_in_radius

-- Vérifier les paramètres
SHOW timezone;
SHOW work_mem;
SHOW effective_cache_size;

-- Tester PostGIS
SELECT postgis_full_version();

-- Tester une fonction
SELECT calculate_distance(9.6412, -13.5784, 9.5370, -13.6785);
-- Devrait retourner ~16000 (mètres entre Kaloum et Matoto)
```

## Réinitialisation

Pour réexécuter ces scripts:

```bash
# Supprimer le volume PostgreSQL
docker-compose down -v

# Redémarrer (les scripts seront réexécutés)
docker-compose up -d postgres
```

## Notes importantes

- Ces scripts ne sont exécutés **qu'une seule fois** à la création du volume
- Les migrations Laravel doivent être exécutées séparément
- Les données des quartiers sont insérées par `DatabaseSeeder.php`
- En production, ajustez `effective_cache_size` selon la RAM disponible

## Troubleshooting

**Extensions non trouvées**:
```bash
# Vérifier que l'image postgis est bien utilisée
docker-compose ps postgres
# Image devrait être: postgis/postgis:15-3.4
```

**Fonctions manquantes**:
```sql
-- Réexécuter manuellement
\i /docker-entrypoint-initdb.d/04-functions.sql
```

**Mauvais timezone**:
```sql
-- Vérifier
SHOW timezone;

-- Corriger
ALTER DATABASE immog_db SET timezone = 'Africa/Conakry';
```
