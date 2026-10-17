package com.hautetech.ndadiee.model.hackathon;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Prix d'un hackathon : son intitulé (« 1er prix », « Prix du public ») et ce qu'il rapporte. */
@Embeddable
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonPrize {

    @Column(nullable = false, length = 80)
    private String title;

    @Column(nullable = false, length = 150)
    private String reward;
}
