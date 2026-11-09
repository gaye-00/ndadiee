package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.model.user.EmailVerification;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByUserId(Long userId);

    @Transactional
    @Modifying
    @Query("delete from EmailVerification v where v.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
