# API — Gestion des erreurs

Sources :
- `backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/hautetech/ndadiee/exception/ErrorResponse.java`

## Format général

Toutes les erreurs sont renvoyées sous le format `ErrorResponse` avec :

- `status` : code HTTP
- `errorCode` : code métier ou technique
- `message` : message lisible par le client
- `validationErrors` : erreurs de validation par champ
- `details` : précisions additionnelles
- `timestamp` : horodatage

## Cas couverts par le gestionnaire

| Type | Code HTTP | `errorCode` |
|---|---|---|
| Erreur métier | variable | selon `BusinessException` |
| Compte suspendu | 403 ou 401 selon contexte | `ACCOUNT_BLOCKED` |
| Validation Bean Validation | 400 | `VALIDATION_ERROR` |
| Paramètre requis manquant | 400 | `MISSING_PARAMETER` |
| Paramètre invalide | 400 | `INVALID_PARAMETER` |
| JSON illisible | 400 | `MALFORMED_REQUEST` |
| Mauvais tri / filtre | 400 | `INVALID_PARAMETER` |
| Authentification | 401 | `BAD_CREDENTIALS` |
| Accès refusé | 403 | `FORBIDDEN` |
| Méthode non supportée | 405 | `METHOD_NOT_ALLOWED` |
| Type de média non supporté | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Fichier trop lourd | 413 | `FILE_TOO_LARGE` |
| Endpoint introuvable | 404 | `ENDPOINT_NOT_FOUND` |
| Conflit de données | 409 | `DUPLICATE_RESOURCE` |
| Erreur interne | 500 | `INTERNAL_ERROR` |

## Points spécifiques

- Les erreurs de validation regroupent les champs concernés.
- Les erreurs de permissions sont centralisées dans `AccessDeniedException`.
- Les erreurs de session de client fermée ne sont pas renvoyées au client : elles sont journalisées.

## Code source

- `backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java`
