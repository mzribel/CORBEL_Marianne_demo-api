# Quête 9 : CD

Attention : Afin de ne pas renseigner de secret dans le script, celui-ci utilise un fichier `.env`.
Pensez à créer celui-ci avant de lancer le script, en utilisant `.env.example` comme base.

## Prérequis

Installés sur la machine : 
- Docker & Docker Compose

Copier le fichier de variables d'environnements et en modifier les valeurs :
```bash
cp demo-api/.env.example demo-api/.env
```

Créer le fichier contenant le mdp de la base (en remplaçant `valeur` par le vrai mdp) : 
```bash
mkdir -p demo-api/secrets
echo "valeur" > demo-api/secrets/db_password.txt
```

## Lancement

```bash
cd demo-api
docker compose up -d --build
curl -s -X POST localhost:8080/products -H "Content-Type: application/json" \
  -d '{"name":"Clavier meca","price_cents":5900}'
docker compose logs notifier | tail -5
```

## Ajouts de la quête

- `demo-api/notifier/` : second service (`GET /health`, `POST /notify`), sans dépendance npm, avec son propre `Dockerfile` (base épinglée, `USER node`, `HEALTHCHECK`)
- `compose.yml` : service `notifier` sur le réseau `demo_back` uniquement, sans `ports:`
- `api` appelle `notifier` en best-effort après un `POST /products` réussi : réponse envoyée d'abord, timeout de 1s, erreur seulement loggée
- `ci.yml` : job `image` en matrix (`api`, `notifier`), chaque image est buildée, scannée (bloquant sur les tags `v*`) puis publiée sur `ghcr.io/<repo>/<service>`
- `ci.yml` : job `deploy` sur les tags `v*`, qui lance `docker compose pull && docker compose up -d`

Attention : Le déploiement est simulé sur le runner GitHub (pas de VM). La cible est temporaire, et le `.env` et le secret sont générés par le job au lieu d'exister déjà sur un serveur.

## Preuves du fonctionnement 

### Local

Logs de `notifier` après un `POST /products` :
```bash
$ docker compose up -d --build
[+] Running 6/6
 ✔ demo-api-notifier              Built
 ✔ demo-api-api                   Built
 ✔ Container demo-api-db-1        Healthy
 ✔ Container demo-api-notifier-1  Started
 ✔ Container demo-api-api-1       Started
 ✔ Container demo-api-adminer-1   Running

$ curl -s -X POST localhost:8080/products -H "Content-Type: application/json" -d '{"name":"Clavier meca","price_cents":5900}'
{"id":5,"name":"Clavier meca","price_cents":5900,"created_at":"2026-11-01T16:49:53.290Z"}

$ docker compose logs notifier | tail -5
notifier-1  | {"level":"info","msg":"notifier started","port":3000}
notifier-1  | {"level":"info","method":"GET","path":"/health","status":200,"ms":5}
notifier-1  | {"level":"info","msg":"notification received","payload":{"event":"product.created","data":{"id":5,"name":"Clavier meca","price_cents":5900 "created_at":"2026-11-01T16:49:53.290Z"}}}
notifier-1  | {"level":"info","method":"POST","path":"/notify","status":202,"ms":1}
```

Test de panne (`notifier` coupé, `POST /products` répond toujours `201`) :
```bash
$ curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/products -H "Content-Type: application/json" -d '{"name":"Souris","price_cents":2500}'
201

$ docker compose logs api | tail -3
api-1  | {"level":"info","method":"POST","path":"/products","status":201,"ms":13}
api-1  | {"level":"warn","msg":"notify failed","err":"The operation was aborted due to timeout"}
```

### Déploiement (job `deploy`)

Pipeline du tag `v1.6.0` (`matrix: image` puis `deploy`) : [ici](https://github.com/mzribel/CORBEL-Marianne_M2-Docker/actions/runs/41330312174)

Images publiées sur GHCR : 
- [api](https://github.com/users/mzribel/packages/container/package/corbel-marianne_m2-docker%2Fapi)
- [notifier](https://github.com/users/mzribel/packages/container/package/corbel-marianne_m2-docker%2Fnotifier)

Fonctionnement de `notifier` (étape "Vérifier la stack déployée" du job `deploy`) :
```txt
Run docker compose images
CONTAINER             REPOSITORY                                           TAG                 PLATFORM            IMAGE ID            SIZE                CREATED
demo-api-adminer-1    adminer                                              4                   linux/amd64         c1c24d89d06f        46.7MB              3 months ago
demo-api-api-1        ghcr.io/mzribel/corbel-marianne_m2-docker/api        1.6.0               linux/amd64         cfe0e6f15bae        63.6MB              About a minute ago
demo-api-db-1         postgres                                             16-alpine           linux/amd64         0cefaabd882e        116MB               10 days ago
demo-api-notifier-1   ghcr.io/mzribel/corbel-marianne_m2-docker/notifier   1.6.0               linux/amd64         5d18c0345dc6        62.8MB              About a minute ago
POST /products -> 201
notifier-1  | {"level":"info","msg":"notifier started","port":3000}
notifier-1  | {"level":"info","method":"GET","path":"/health","status":200,"ms":4}
notifier-1  | {"level":"info","msg":"notification received","payload":{"event":"product.created","data":{"id":4,"name":"Deploy check","price_cents":100,"created_at":"2026-11-01T17:14:13.747Z"}}}
notifier-1  | {"level":"info","method":"POST","path":"/notify","status":202,"ms":2}
```