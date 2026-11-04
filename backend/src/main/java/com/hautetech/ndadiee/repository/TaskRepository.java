package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.workspace.Sprint;
import com.hautetech.ndadiee.model.workspace.Task;
import com.hautetech.ndadiee.model.workspace.TaskStatus;
import com.hautetech.ndadiee.service.workspace.Revision;

public interface TaskRepository extends JpaRepository<Task, Long> {

    /** Le tableau : les tâches pas encore rangées dans un sprint clos, colonne par colonne, de haut en bas. */
    @EntityGraph(attributePaths = { "assignee", "author", "movedBy", "pullRequest" })
    @Query("""
            SELECT t FROM Task t
            WHERE t.project.id = :projectId AND t.sprint IS NULL
            ORDER BY t.position ASC, t.id ASC
            """)
    List<Task> findBoard(@Param("projectId") Long projectId);

    /** Une colonne du tableau, de haut en bas. */
    @Query("""
            SELECT t FROM Task t
            WHERE t.project.id = :projectId AND t.sprint IS NULL AND t.status = :status
            ORDER BY t.position ASC, t.id ASC
            """)
    List<Task> findColumn(@Param("projectId") Long projectId, @Param("status") TaskStatus status);

    Optional<Task> findByProjectIdAndNumber(Long projectId, int number);

    @Query("SELECT COALESCE(MAX(t.number), 0) FROM Task t WHERE t.project.id = :projectId")
    int findLastNumber(@Param("projectId") Long projectId);

    // Les tâches du tableau, et parmi elles celles d'une colonne (l'avancement du sprint)
    long countByProjectIdAndSprintIsNull(Long projectId);

    long countByProjectIdAndSprintIsNullAndStatus(Long projectId, TaskStatus status);

    long countBySprintId(Long sprintId);

    /** Ce qui change sur le tableau se voit ici : une tâche de plus ou de moins, ou une tâche modifiée. */
    @Query("""
            SELECT new com.hautetech.ndadiee.service.workspace.Revision(COUNT(t), MAX(t.updatedAt))
            FROM Task t WHERE t.project.id = :projectId
            """)
    Revision findRevision(@Param("projectId") Long projectId);

    /** Le sprint se clôt : les tâches terminées quittent le tableau, livrées pendant ce sprint. */
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE Task t SET t.sprint = :sprint, t.updatedAt = :now
            WHERE t.project.id = :projectId AND t.sprint IS NULL AND t.status = :done
            """)
    int archiveDone(@Param("projectId") Long projectId, @Param("sprint") Sprint sprint, @Param("done") TaskStatus done,
            @Param("now") Instant now);

    /** Un membre quitte l'équipe : ses tâches attendent un nouveau preneur. */
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE Task t SET t.assignee = NULL, t.updatedAt = :now
            WHERE t.project.id = :projectId AND t.assignee.id = :userId
            """)
    int unassign(@Param("projectId") Long projectId, @Param("userId") Long userId, @Param("now") Instant now);
}
