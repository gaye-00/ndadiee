# Image de production du front : l'application est compilée à part, Nginx sert le résultat et relaie l'API.
FROM node:24-slim AS build
WORKDIR /build
# Les manifestes d'abord : les dépendances restent en cache tant qu'ils ne changent pas
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Adresse relative : le front appelle l'API sur son propre hôte, quels que soient l'IP, le port ou le domaine
ARG VITE_BACKEND_URL=/api
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-api-proxy.conf /etc/nginx/snippets/api-proxy.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
