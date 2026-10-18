package com.hautetech.ndadiee.mapper;

import org.hibernate.Hibernate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.AdminActionResponse;
import com.hautetech.ndadiee.dto.response.AdminUserResponse;
import com.hautetech.ndadiee.model.admin.AdminAction;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.User;

@Mapper(config = MapperConfiguration.class, uses = UserMapper.class)
public interface AdminMapper {

    AdminActionResponse toActionResponse(AdminAction action);

    /** Un compte du back-office ; ses compteurs de publications sont renseignés par AdminUserService. */
    default AdminUserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        // Une relation LAZY vers la classe abstraite User donne un proxy : instanceof ne suffit pas
        User account = (User) Hibernate.unproxy(user);
        AdminUserResponse response = toAccountResponse(account);
        if (account instanceof Developer developer) {
            response.setUserType("developer");
            response.setCountry(developer.getCountry());
            response.setReputation(developer.getReputation());
        } else {
            response.setUserType("admin");
        }
        return response;
    }

    @Mapping(target = "userType", ignore = true)
    @Mapping(target = "country", ignore = true)
    @Mapping(target = "reputation", ignore = true)
    AdminUserResponse toAccountResponse(User user);
}
