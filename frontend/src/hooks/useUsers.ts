import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { UpdateProfileRequest, UserFilters } from '@/types/user.types';

/** Annuaire des développeurs. */
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.search(filters),
    placeholderData: keepPreviousData,
  });
}

export function useUserProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['user', username],
    queryFn: () => userService.getProfile(username!),
    enabled: !!username,
  });
}

/** Suit un développeur ou cesse de le suivre. */
export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, follow }: { username: string; follow: boolean }) =>
      follow ? userService.follow(username) : userService.unfollow(username),
    onSuccess: (_result, { username }) => {
      void qc.invalidateQueries({ queryKey: ['user', username] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => userService.updateProfile(body),
    onSuccess: (user) => {
      setUser(user);
      void qc.invalidateQueries({ queryKey: ['user', user.username] });
    },
    meta: { handlesError: true },
  });
}
