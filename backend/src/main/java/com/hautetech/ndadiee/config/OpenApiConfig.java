package com.hautetech.ndadiee.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/** Documentation Swagger : disponible sur /api/swagger-ui.html. */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI ndadieeOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ndadiee API")
                        .version("v1")
                        .description("API de Ndadiee, la plateforme d'échange des développeurs africains : "
                                + "questions/réponses, articles, projets open source, opportunités, profils et réputation."))
                // Bouton « Authorize » : coller l'access token obtenu via /v1/auth/login
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .components(new Components().addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
