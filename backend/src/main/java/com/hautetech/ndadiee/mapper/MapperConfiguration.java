package com.hautetech.ndadiee.mapper;

import org.mapstruct.MapperConfig;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * Configuration commune des mappers. Les champs de réponse qui dépendent du contexte
 * (vote du membre connecté, compteurs...) ne viennent pas de l'entité : ils sont
 * laissés vides ici et renseignés par les services.
 */
@MapperConfig(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MapperConfiguration {
}
