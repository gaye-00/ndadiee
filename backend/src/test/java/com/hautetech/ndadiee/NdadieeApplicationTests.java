package com.hautetech.ndadiee;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.hautetech.ndadiee.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Démarre l'application et valide la migration Flyway sur une base PostgreSQL jetable.
 */
@SpringBootTest(properties = {
		"ndadiee.seed.enabled=false",
		"jwt.secret=VGhpcy1pcy1hLXRlc3Qtb25seS1rZXktMzItYnl0ZXMtbG9uZw=="
})
@ActiveProfiles("test")
class NdadieeApplicationTests {

	@Autowired
	private UserRepository userRepository;

	@Test
	void contextLoads() {
	}

	@Test
	void demoAccountsAreNotSeededInTestProfile() {
		assertFalse(userRepository.existsByUsername("admin"));
		assertFalse(userRepository.existsByUsername("ada"));
		assertFalse(userRepository.existsByUsername("musa"));
	}

}
