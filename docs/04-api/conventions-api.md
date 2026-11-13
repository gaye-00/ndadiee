# API — Conventions de développement

Sources :
- `backend/src/main/java/com/hautetech/ndadiee/common/ApiResponse.java`
- les contrôleurs REST et la configuration sécurité

## 1. Couverture des réponses

Toutes les réponses à succès utilisent l’enveloppe `ApiResponse<T>`.

```json
{
  "success": true,
  "message": "Action réalisée",
  "data": { }
}
```

## 2. Authentification

- JWT en `Authorization: Bearer ...`
- Stateless, sans cookie de session
- Les routes sont protégées par `SecurityConfiguration`

## 3. Contrôle d’accès

- `public` : lecture fluide, contenu communautaire, profils, tags
- `authenticated` : écriture métier, messagerie, workspace, notifications
- `admin` : back-office et gestion des contenus/comptes

## 4. Préfixes et conventions de nommage

Le backend ajoute le contexte `/api` depuis `server.servlet.context-path`; les chemins documentés commençant par `/v1` sont donc accessibles sous `/api/v1` en local, par exemple `http://localhost:8080/api/v1/auth/login`.

- Chemins sous forme `/v1/<ressource>`
- Paramètres de chemin : Pascal-case en Java, snake/slug dans les chemins
- Paramètres de query : explicitement nommés dans les signatures
- DTO nommés par rôle métier (`Create...`, `Update...`, `Request`, `Response`)

## 5. Paginatation

Les contrôleurs utilisent Spring Data `Pageable` et `PageResponse`. Les cas observés utilisent :

- `page`
- `size`
- `sort`

## 6. Validation

Les DTO de requête sont annotés par `@Valid` et les erreurs remontent via `MethodArgumentNotValidException`.

## 7. Codes HTTP observés

- `200 OK` : lecture et mise à jour simple
- `201 Created` : création de ressource
- `400 Bad Request` : validation / paramètres invalides
- `401 Unauthorized` : jeton absent ou invalide
- `403 Forbidden` : permission insuffisante
- `404 Not Found` : ressource absente
- `409 Conflict` : conflit de donnée
- `413 Payload Too Large` : fichier trop volumineux
- `500 Internal Server Error` : défaut non géré

## 8. Limite de vérification

Ces conventions sont issues directement des contrôleurs et du gestionnaire d’erreurs. Les règles de versionnement API ne sont pas explicitement matérialisées dans le dépôt.
