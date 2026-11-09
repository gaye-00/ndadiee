package com.hautetech.ndadiee.authentication.oauth;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.hautetech.ndadiee.model.user.OAuthProvider;

import lombok.extern.slf4j.Slf4j;

/** Les fournisseurs de connexion (GitHub, Google) : actifs dès que leur identifiant et leur secret sont définis. */
@Slf4j
@Configuration
@EnableConfigurationProperties(OAuthProperties.class)
public class OAuthConfiguration {

    @Bean
    public OAuthClient oauthClient(OAuthProperties properties) {
        for (OAuthProvider provider : OAuthProvider.values()) {
            String prefix = provider.name();
            log.info("[OAuth] Connexion avec {} : {}", provider.displayName(), properties.client(provider).enabled()
                    ? "active"
                    : "inactive (définir " + prefix + "_CLIENT_ID et " + prefix + "_CLIENT_SECRET)");
        }
        return new OAuthClient(properties);
    }
}
