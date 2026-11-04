package com.hautetech.ndadiee;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Démarre toute l'application : la configuration est cohérente et le schéma créé par Hibernate depuis les entités
 * correspond aux entités. A besoin de la base PostgreSQL locale (voir README).
 */
@SpringBootTest(properties = "ndadiee.seed.enabled=false")
class NdadieeApplicationTests {

	@Test
	void contextLoads() {
	}

}
