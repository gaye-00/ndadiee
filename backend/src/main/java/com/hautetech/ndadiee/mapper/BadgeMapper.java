package com.hautetech.ndadiee.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.BadgeResponse;
import com.hautetech.ndadiee.dto.response.UserBadgeResponse;
import com.hautetech.ndadiee.model.badge.Badge;
import com.hautetech.ndadiee.model.badge.UserBadge;

@Mapper(config = MapperConfiguration.class)
public interface BadgeMapper {

    BadgeResponse toResponse(Badge badge);

    List<BadgeResponse> toResponses(List<Badge> badges);

    UserBadgeResponse toUserBadgeResponse(UserBadge userBadge);

    List<UserBadgeResponse> toUserBadgeResponses(List<UserBadge> userBadges);
}
