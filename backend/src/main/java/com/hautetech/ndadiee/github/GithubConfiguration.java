package com.hautetech.ndadiee.github;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.extern.slf4j.Slf4j;

/** Le client de l'API GitHub, avec ou sans jeton (GITHUB_TOKEN). */
@Slf4j
@Configuration
@EnableConfigurationProperties({ GithubProperties.class, GithubSyncProperties.class })
public class GithubConfiguration {

    @Bean
    public GithubClient githubClient(GithubProperties properties) {
        log.info("[GitHub] API {} {}", properties.apiUrl(),
                properties.token() == null ? "sans jeton (60 requêtes par heure : définir GITHUB_TOKEN)" : "avec jeton");
        return new GithubClient(properties);
    }
}
