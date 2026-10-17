package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.project.ProjectGithubActivity;

public interface ProjectGithubActivityRepository extends JpaRepository<ProjectGithubActivity, Long> {

    Optional<ProjectGithubActivity> findByProjectId(Long projectId);
}
