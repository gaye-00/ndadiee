package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.hautetech.ndadiee.model.hackathon.Hackathon;

public interface HackathonRepository extends JpaRepository<Hackathon, Long>, JpaSpecificationExecutor<Hackathon> {

    Optional<Hackathon> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
