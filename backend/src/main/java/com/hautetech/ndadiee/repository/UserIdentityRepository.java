package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.user.OAuthProvider;
import com.hautetech.ndadiee.model.user.UserIdentity;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserIdentity> findByProviderAndSubject(OAuthProvider provider, String subject);

    boolean existsByUserIdAndProvider(Long userId, OAuthProvider provider);
}
