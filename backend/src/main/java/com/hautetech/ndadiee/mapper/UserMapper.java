package com.hautetech.ndadiee.mapper;

import org.hibernate.Hibernate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.authentication.UserResponse;
import com.hautetech.ndadiee.dto.response.UserProfileResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.model.user.Admin;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.User;

@Mapper(config = MapperConfiguration.class, uses = TagMapper.class)
public interface UserMapper {

    UserSummaryResponse toSummary(Developer developer);

    /**
     * Pour les relations typées User (auteur d'une opportunité, acteur d'une notification) :
     * le compte peut être un Admin, qui n'a pas de profil public.
     */
    default UserSummaryResponse toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        // Une relation LAZY vers la classe abstraite User donne un proxy : instanceof ne suffit pas
        User account = (User) Hibernate.unproxy(user);
        if (account instanceof Developer developer) {
            return toSummary(developer);
        }
        return UserSummaryResponse.builder()
                .id(account.getId())
                .username(account.getUsername())
                .fullName(account.getFullName())
                .avatarUrl(account.getAvatarUrl())
                .build();
    }

    // badges, compteurs et followedByMe sont renseignés par UserService
    @Mapping(target = "badges", ignore = true)
    UserProfileResponse toProfile(Developer developer);

    default UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        User account = (User) Hibernate.unproxy(user);
        if (account instanceof Developer developer) {
            return toDeveloperResponse(developer);
        }
        return toAdminResponse((Admin) account);
    }

    @Mapping(target = "userType", constant = "developer")
    UserResponse toDeveloperResponse(Developer developer);

    @Mapping(target = "userType", constant = "admin")
    UserResponse toAdminResponse(Admin admin);
}
