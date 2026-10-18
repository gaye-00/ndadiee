package com.hautetech.ndadiee.mapper;

import java.util.Arrays;
import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.hautetech.ndadiee.dto.response.BadgeResponse;
import com.hautetech.ndadiee.dto.response.UserBadgeResponse;
import com.hautetech.ndadiee.model.badge.Badge;
import com.hautetech.ndadiee.model.badge.BadgeType;
import com.hautetech.ndadiee.model.badge.UserBadge;

@Mapper(config = MapperConfiguration.class)
public interface BadgeMapper {

    @Mapping(target = "type", source = "name", qualifiedByName = "badgeType")
    BadgeResponse toResponse(Badge badge);

    List<BadgeResponse> toResponses(List<Badge> badges);

    UserBadgeResponse toUserBadgeResponse(UserBadge userBadge);

    List<UserBadgeResponse> toUserBadgeResponses(List<UserBadge> userBadges);

    /** Le badge du catalogue qui porte ce nom (la table badges est retrouvée par nom) ; null pour un autre badge. */
    @Named("badgeType")
    default BadgeType typeOf(String name) {
        return Arrays.stream(BadgeType.values()).filter(type -> type.getLabel().equals(name)).findFirst().orElse(null);
    }
}
