package com.hautetech.ndadiee.model.project;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Entrée du devlog d'un projet : ce qui vient de changer, en une ou deux phrases, avec sa version
 * quand c'est une release (« v0.7 · Cache Redis : 1,8 s → 120 ms »). Écrite par un membre de l'équipe.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "devlog_entries", indexes = @Index(name = "idx_devlog_entries_project", columnList = "project_id, created_at DESC"))
public class DevlogEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    // Version publiée, quand il y en a une : « v0.7 »
    @Column(length = 30)
    private String version;

    @Column(nullable = false, length = 1000)
    private String body;
}
