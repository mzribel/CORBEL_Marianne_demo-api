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
```
mkdir -p demo-api/secrets
echo "valeur" > secrets/db_password.txt
```