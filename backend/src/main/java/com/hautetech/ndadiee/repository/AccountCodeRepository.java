package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.model.user.AccountCode;
import com.hautetech.ndadiee.model.user.AccountCode.Purpose;

public interface AccountCodeRepository extends JpaRepository<AccountCode, Long> {

    Optional<AccountCode> findByUserIdAndPurpose(Long userId, Purpose purpose);

    @Transactional
    @Modifying
    @Query("delete from AccountCode c where c.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
