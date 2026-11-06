package com.hautetech.ndadiee.initializer;

import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.hautetech.ndadiee.repository.UserRepository;

@SpringBootTest(properties = {
        "jwt.secret=VGhpcy1pcy1hLXRlc3Qtb25seS1rZXktMzItYnl0ZXMtbG9uZw=="
})
@ActiveProfiles("prod")
class ProductionSeedSafetyTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void demoAccountsAreNotSeededInProductionProfile() {
        assertFalse(userRepository.existsByUsername("admin"));
        assertFalse(userRepository.existsByUsername("ada"));
        assertFalse(userRepository.existsByUsername("musa"));
    }
}
