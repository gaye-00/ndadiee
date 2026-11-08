# Image de production du backend : le jar est compilé à part, l'image finale n'embarque qu'un JRE.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
# Le pom d'abord : les dépendances restent en cache tant qu'il ne change pas
COPY pom.xml ./
RUN mvn -B -q -ntp dependency:go-offline
COPY src ./src
# Les tests ont besoin d'une base : ils ne tournent pas pendant la construction de l'image
RUN mvn -B -q -ntp package -Dmaven.test.skip=true

FROM eclipse-temurin:21-jre
RUN groupadd --system --gid 1001 ndadiee \
    && useradd --system --uid 1001 --gid ndadiee --no-create-home ndadiee \
    && mkdir -p /app/uploads \
    && chown -R ndadiee:ndadiee /app
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
USER ndadiee
# La mémoire suit la limite du conteneur ; une JVM à court de mémoire s'arrête et Docker la relance
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
