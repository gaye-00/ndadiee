# Diagrammes d’architecture

## 1. Architecture globale

```mermaid
flowchart LR
    U[Utilisateur navigateur] --> FE[Frontend React + Vite]
    FE --> API[API Spring Boot /api]
    API --> DB[(PostgreSQL)]
    API --> GH[GitHub API]
    API --> R2[Cloudflare R2 / S3]
    API --> SMTP[SMTP]
    FE --> WS[WebSocket STOMP /ws]
    WS --> API
```

## 2. Architecture backend

```mermaid
flowchart TD
    C[Controller] --> S[Service]
    S --> R[Repository]
    R --> DB[(PostgreSQL)]
    S --> G[GitHubClient]
    S --> M[MailSender]
    S --> ST[FileStorage]
    C --> SF[Security Filter]
    SF --> JWT[JWT]
```

## 3. Architecture frontend

```mermaid
flowchart TD
    A[App.tsx] --> P[Providers]
    P --> R[Router]
    R --> V[Pages]
    V --> H[Hooks]
    H --> API[Axios API client]
    H --> S[Zustand store]
    S --> QC[React Query cache]
    V --> WS[ChatSocket STOMP]
```

## 4. Modèle de données principal

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    USER ||--o{ MESSAGE : sends
    USER ||--o{ CONVERSATION_PARTICIPANT : participates
    PROJECT ||--o{ PROJECT_MEMBER : contains
    PROJECT ||--o{ PROJECT_OPENING : opens
    PROJECT }o--o{ TAG : tagged
    CONVERSATION ||--o{ MESSAGE : contains
    DEVELOPER ||--o{ USER_FOLLOWS : follows
```

## 5. Authentification

```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant API
    participant JWT
    participant DB

    Client->>Frontend: identifiants
    Frontend->>API: /v1/auth/login
    API->>DB: vérifier user/password
    DB-->>API: compte
    API-->>Frontend: accessToken + refreshToken
    Frontend->>API: requête avec Bearer accessToken
    API->>JWT: valider JWT
    JWT-->>API: username
    API-->>Frontend: réponse métier
```

## 6. Communication WebSocket

```mermaid
sequenceDiagram
    participant Browser
    participant WS as STOMP /ws
    participant Spring as Backend
    participant Queue as /user/queue/chat

    Browser->>WS: CONNECT Authorization
    WS->>Spring: validate token and user
    Browser->>WS: SEND /app/conversations/42/typing
    Spring-->>Queue: convertAndSendToUser(userId, /queue/chat, payload)
    Queue-->>Browser: événement de chat
```

## 7. Cycle de vie d’un projet

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Published: publish()
    Published --> OpenForContributors: lookingForContributors
    OpenForContributors --> AcceptedMember: join + decision
    AcceptedMember --> Workspace: team activation
    Workspace --> Archived: close or delete
    Archived --> [*]
```

## 8. Parcours de collaboration

```mermaid
flowchart LR
    A[Créer son profil] --> B[Publier un projet]
    B --> C[Définir des openings]
    C --> D[Recevoir des candidatures]
    D --> E[Valider ou refuser]
    E --> F[Travailler dans le workspace]
    F --> G[Messagerie / forum / reviews]
    G --> H[Suivi, feedback, clôture]
```

## Observations

- Les diagrammes ci-dessus se basent sur les classes et config réellement observées dans le dépôt ;
- ils reflètent des mécanismes existants, pas des schémas hypothétiques ;
- les éléments de production non vérifiés restent à confirmer dans l’environnement réel.

## Fichiers sources examinés

- [backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/model/project/Project.java](../../backend/src/main/java/com/hautetech/ndadiee/model/project/Project.java)
- [backend/src/main/java/com/hautetech/ndadiee/model/user/Developer.java](../../backend/src/main/java/com/hautetech/ndadiee/model/user/Developer.java)
- [backend/src/main/java/com/hautetech/ndadiee/model/message/Conversation.java](../../backend/src/main/java/com/hautetech/ndadiee/model/message/Conversation.java)
- [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
- [frontend/src/lib/chatSocket.ts](../../frontend/src/lib/chatSocket.ts)

## Documentation associée

- [architecture-backend.md](architecture-backend.md)
- [architecture-frontend.md](architecture-frontend.md)
- [architecture-base-de-donnees.md](architecture-base-de-donnees.md)
- [architecture-securite.md](architecture-securite.md)
- [architecture-websocket.md](architecture-websocket.md)
- [integrations-externes.md](integrations-externes.md)
