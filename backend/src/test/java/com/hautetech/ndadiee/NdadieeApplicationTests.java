package com.hautetech.ndadiee;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Démarre toute l'application : la configuration est cohérente et le schéma créé par Flyway
 * correspond aux entités. A besoin de la base PostgreSQL (docker compose up -d).
 */
@SpringBootTest(properties = "ndadiee.seed.enabled=false")
class NdadieeApplicationTests {

	@Test
	void contextLoads() {
	}

}
