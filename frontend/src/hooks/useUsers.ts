import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserResponse } from '@/types/auth.types';
import type { UpdateProfileRequest, UserFilters, UserProfile } from '@/types/user.types';

// Projets du profil chargés à la fois : deux rangées de trois cartes
const PROFILE_PROJECTS_PAGE_SIZE = 6;

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

/** Les projets dont le développeur fait partie, page après page (vitrine de son profil). */
export function useUserProjects(username: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['user', username, 'projects'],
    queryFn: ({ pageParam }) => userService.getProjects(username!, { page: pageParam, size: PROFILE_PROJECTS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: !!username,
  });
}

/** Les membres avec qui le développeur a fait équipe (« A travaillé avec »). */
export function useCollaborators(username: string | undefined) {
  return useQuery({
    queryKey: ['user', username, 'collaborators'],
    queryFn: () => userService.getCollaborators(username!),
    enabled: !!username,
  });
}

/** Ses contributions sur la plateforme, jour par jour, sur la dernière année. */
export function useUserActivity(username: string | undefined) {
  return useQuery({
    queryKey: ['user', username, 'activity'],
    queryFn: () => userService.getActivity(username!),
    enabled: !!username,
  });
}

/**
 * Suit un développeur ou cesse de le suivre. Son profil suit tout de suite (le bouton, le nombre d'abonnés) ; le
 * serveur confirme ensuite, et un refus remet le profil comme avant.
 */
export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, follow }: { username: string; follow: boolean }) =>
      follow ? userService.follow(username) : userService.unfollow(username),
    onMutate: async ({ username, follow }) => {
      const key = ['user', username];
      await qc.cancelQueries({ queryKey: key, exact: true });
      const previous = qc.getQueryData<UserProfile>(key);
      if (previous && previous.followedByMe !== follow) {
        qc.setQueryData<UserProfile>(key, {
          ...previous,
          followedByMe: follow,
          followersCount: Math.max(0, previous.followersCount + (follow ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_error, { username }, context) => {
      if (context?.previous) {
        qc.setQueryData(['user', username], context.previous);
      }
    },
    onSettled: (_result, _error, { username }) => {
      void qc.invalidateQueries({ queryKey: ['user', username], exact: true });
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

/**
 * Le compte après un changement de photo : le profil la montre tout de suite. La photo paraît aussi ailleurs (un
 * auteur, une équipe, un coéquipier) : tout ce qui est en cache est à relire, la page affichée tout de suite, les
 * autres à leur prochain affichage.
 */
function useAvatarChanged() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return (user: UserResponse) => {
    setUser(user);
    void qc.invalidateQueries();
    qc.setQueryData<UserProfile>(['user', user.username], (profile) => profile && { ...profile, avatarUrl: user.avatarUrl });
  };
}

/** Change sa photo de profil : l'image déjà recadrée (lib/avatarImage.ts), avec l'avancement de l'envoi. */
export function useUpdateAvatar() {
  const changed = useAvatarChanged();
  return useMutation({
    mutationFn: ({ image, name, onProgress }: { image: Blob; name: string; onProgress?: (fraction: number) => void }) =>
      userService.updateAvatar(image, name, onProgress),
    onSuccess: changed,
    meta: { handlesError: true },
  });
}

/** Retire sa photo de profil. */
export function useDeleteAvatar() {
  const changed = useAvatarChanged();
  return useMutation({
    mutationFn: userService.deleteAvatar,
    onSuccess: changed,
    meta: { handlesError: true },
  });
}
