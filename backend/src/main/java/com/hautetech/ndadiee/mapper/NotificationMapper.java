package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.NotificationResponse;
import com.hautetech.ndadiee.model.notification.Notification;

@Mapper(config = MapperConfiguration.class, uses = UserMapper.class)
public interface NotificationMapper {

    // targetSlug et targetTitle sont renseignés par NotificationService
    NotificationResponse toResponse(Notification notification);
}
