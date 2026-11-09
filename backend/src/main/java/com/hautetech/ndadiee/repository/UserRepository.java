package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    // Connexion par email ou par nom d'utilisateur
    Optional<User> findByEmailOrUsername(String email, String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    // Les inscriptions jamais confirmées par le code reçu par e-mail, créées avant cette date (ménage)
    @Query("select u.id from User u where u.emailVerified = false and u.createdAt < :before")
    List<Long> findIdsOfUnconfirmedCreatedBefore(@Param("before") Instant before);

    // ─── Back-office ───

    long countByRole(Role role);

    long countByBlockedAtIsNotNull();
}
