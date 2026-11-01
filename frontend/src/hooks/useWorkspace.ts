import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { moveTask, removeTask } from '@/components/workspace/board';
import { projectService } from '@/services/project.service';
import { workspaceService } from '@/services/workspace.service';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { UserResponse } from '@/types/auth.types';
import type { ProjectRole, ProjectSettingsRequest, TeamRole } from '@/types/project.types';
import type { UserSummary } from '@/types/user.types';
import type {
  SprintRequest,
  Task,
  TaskMoveRequest,
  TaskRequest,
  TeamChatPage,
  TeamEventRequest,
  TeamMessage,
  Workspace,
  WorkspacePulse,
} from '@/types/workspace.types';

/** Les données d'un espace d'équipe, rangées sous son slug : tout s'invalide d'un coup avec ['workspace', slug]. */
export const workspaceKeys = {
  all: (slug: string) => ['workspace', slug] as const,
  overview: (slug: string) => ['workspace', slug, 'overview'] as const,
  tasks: (slug: string) => ['workspace', slug, 'tasks'] as const,
  task: (slug: string, number: number) => ['workspace', slug, 'task', number] as const,
  pullRequests: (slug: string) => ['workspace', slug, 'pull-requests'] as const,
  chat: (slug: string) => ['workspace', slug, 'chat'] as const,
  pulse: (slug: string) => ['workspace', slug, 'pulse'] as const,
};

const moveKey = (slug: string) => ['workspace', slug, 'move'] as const;

/** Le membre connecté, comme l'API le montre à côté de ce qu'il écrit : pour afficher un geste avant la réponse. */
function summaryOf(user: UserResponse): UserSummary {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    country: user.country,
    reputation: user.reputation,
    level: user.level,
  };
}

/** Le statut HTTP d'une erreur de l'API : 403 hors de l'équipe, 404 projet introuvable. */
export function errorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

// ==================== LECTURE ====================

/** L'espace : le projet, l'équipe et qui est là, le sprint en cours, ce qui attend dans les onglets. */
export function useWorkspace(slug: string) {
  return useQuery({ queryKey: workspaceKeys.overview(slug), queryFn: () => workspaceService.get(slug) });
}

/** Le tableau : toutes les tâches, chacune à sa place. */
export function useWorkspaceTasks(slug: string) {
  return useQuery({ queryKey: workspaceKeys.tasks(slug), queryFn: () => workspaceService.getTasks(slug) });
}

/** Une tâche qui n'est pas au tableau (livrée pendant un sprint clos) : un lien « ?task=29 », une mention « #29 ». */
export function useWorkspaceTask(slug: string, number: number | null) {
  return useQuery({
    queryKey: workspaceKeys.task(slug, number ?? 0),
    queryFn: () => workspaceService.getTask(slug, number!),
    enabled: number !== null,
  });
}

/** Les PR qu'une tâche peut livrer ; demandées quand on choisit la PR d'une tâche. */
export function useLinkablePullRequests(slug: string, enabled: boolean) {
  return useQuery({ queryKey: workspaceKeys.pullRequests(slug), queryFn: () => workspaceService.getPullRequests(slug), enabled });
}

export const CHAT_PAGE_SIZE = 30;

export type ChatData = InfiniteData<TeamChatPage, number | undefined>;

/**
 * La discussion, page après page en remontant le temps : la première page porte les derniers messages et le rendez-vous
 * épinglé ; chacune est dans l'ordre de lecture.
 */
export function useTeamChat(slug: string) {
  return useInfiniteQuery<TeamChatPage, Error, ChatData, ReturnType<typeof workspaceKeys.chat>, number | undefined>({
    queryKey: workspaceKeys.chat(slug),
    queryFn: ({ pageParam }) => workspaceService.getMessages(slug, { before: pageParam, size: CHAT_PAGE_SIZE }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore && last.messages.length > 0 ? last.messages[0].id : undefined),
  });
}

/** Les messages de la discussion, du plus ancien au plus récent. */
export function chatMessages(data: ChatData | undefined): TeamMessage[] {
  return data ? [...data.pages].reverse().flatMap((page) => page.messages) : [];
}

// ==================== LE POULS ====================

// Toutes les quatre secondes quand l'onglet est à l'écran, quinze en économie de données ; rien en arrière-plan
const PULSE_INTERVAL = 4_000;
const DATA_SAVER_PULSE_INTERVAL = 15_000;

/**
 * Le pouls de l'espace : dit à l'équipe que le membre est là, et garde l'espace à jour sans tout relire. Chaque
 * réponse donne qui est en ligne (mis dans l'en-tête tel quel) et une révision du tableau, de l'équipe et de la
 * discussion : seule la partie dont la révision change est relue. S'arrête quand l'onglet passe en arrière-plan.
 */
export function useWorkspacePulse(slug: string, enabled: boolean) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const pulse = useQuery({
    queryKey: workspaceKeys.pulse(slug),
    queryFn: () => workspaceService.pulse(slug),
    enabled,
    refetchInterval: dataSaver ? DATA_SAVER_PULSE_INTERVAL : PULSE_INTERVAL,
    gcTime: 0,
    retry: false,
  });
  const seen = useRef<WorkspacePulse | null>(null);

  useEffect(() => {
    const now = pulse.data;
    if (!now) {
      return;
    }
    const before = seen.current;
    seen.current = now;
    markOnline(qc, slug, new Set([...now.online, ...(user ? [user.id] : [])]));
    if (!before) {
      return;
    }
    if (before.board !== now.board) {
      // Une carte en route : sa réponse fera foi ; on relira au prochain battement si besoin
      if (qc.isMutating({ mutationKey: moveKey(slug) }) > 0) {
        seen.current = { ...now, board: before.board };
      } else {
        void qc.invalidateQueries({ queryKey: workspaceKeys.tasks(slug) });
      }
    }
    if (before.team !== now.team) {
      void qc.invalidateQueries({ queryKey: workspaceKeys.overview(slug) });
    }
    if (before.chat !== now.chat) {
      void qc.invalidateQueries({ queryKey: workspaceKeys.chat(slug) });
    }
  }, [pulse.data, qc, slug, user]);

  // Retiré de l'équipe entre-temps : l'espace se relit, et montre qu'il est fermé
  const lostAccess = errorStatus(pulse.error) === 403 || errorStatus(pulse.error) === 404;
  useEffect(() => {
    if (lostAccess) {
      void qc.invalidateQueries({ queryKey: workspaceKeys.overview(slug) });
    }
  }, [lostAccess, qc, slug]);
}

function markOnline(qc: QueryClient, slug: string, online: Set<number>) {
  qc.setQueryData<Workspace>(workspaceKeys.overview(slug), (workspace) => {
    if (!workspace || workspace.members.every((member) => member.online === online.has(member.user.id))) {
      return workspace;
    }
    return { ...workspace, members: workspace.members.map((member) => ({ ...member, online: online.has(member.user.id) })) };
  });
}

// ==================== TABLEAU ====================

function useBoard(slug: string) {
  const qc = useQueryClient();
  return {
    qc,
    read: () => qc.getQueryData<Task[]>(workspaceKeys.tasks(slug)),
    write: (update: (tasks: Task[]) => Task[]) =>
      qc.setQueryData<Task[]>(workspaceKeys.tasks(slug), (tasks) => (tasks ? update(tasks) : tasks)),
    // Le sprint compte les tâches du tableau et celles qui sont terminées
    refreshSprint: () => void qc.invalidateQueries({ queryKey: workspaceKeys.overview(slug) }),
  };
}

/** Une nouvelle tâche, en bas de sa colonne. Les erreurs (champ refusé) sont montrées par le formulaire. */
export function useCreateTask(slug: string) {
  const board = useBoard(slug);
  return useMutation({
    mutationFn: (body: TaskRequest) => workspaceService.createTask(slug, body),
    onSuccess: (task) => {
      board.write((tasks) => [...tasks.filter((candidate) => candidate.id !== task.id), task]);
      board.refreshSprint();
    },
    meta: { handlesError: true },
  });
}

/** Modifie une tâche ; une autre colonne l'y envoie en bas, et le tableau se relit. */
export function useUpdateTask(slug: string) {
  const board = useBoard(slug);
  return useMutation({
    mutationFn: ({ number, body }: { number: number; body: TaskRequest }) => workspaceService.updateTask(slug, number, body),
    onSuccess: (task, { body }) => {
      board.write((tasks) => tasks.map((candidate) => (candidate.id === task.id ? task : candidate)));
      board.qc.setQueryData(workspaceKeys.task(slug, task.number), task);
      if (body.status !== undefined) {
        void board.qc.invalidateQueries({ queryKey: workspaceKeys.tasks(slug) });
        board.refreshSprint();
      }
    },
    meta: { handlesError: true },
  });
}

/**
 * Glisse une tâche ailleurs : le tableau change tout de suite, puis prend l'ordre que renvoie le serveur (celui de
 * tout le monde). Refusé, il revient comme avant et l'erreur s'affiche.
 */
export function useMoveTask(slug: string) {
  const board = useBoard(slug);
  const { user } = useAuth();
  return useMutation({
    mutationKey: moveKey(slug),
    mutationFn: ({ number, move }: { number: number; move: TaskMoveRequest }) => workspaceService.moveTask(slug, number, move),
    onMutate: async ({ number, move }) => {
      await board.qc.cancelQueries({ queryKey: workspaceKeys.tasks(slug) });
      const previous = board.read();
      board.write((tasks) => moveTask(tasks, number, move.status, move.position, user ? summaryOf(user) : null));
      return { previous, changedColumn: previous?.find((task) => task.number === number)?.status !== move.status };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        board.qc.setQueryData(workspaceKeys.tasks(slug), context.previous);
      }
    },
    onSuccess: (tasks, _variables, context) => {
      // Un autre geste suit déjà : sa réponse portera l'ordre final
      if (board.qc.isMutating({ mutationKey: moveKey(slug) }) <= 1) {
        board.qc.setQueryData(workspaceKeys.tasks(slug), tasks);
      }
      if (context?.changedColumn) {
        board.refreshSprint();
      }
    },
  });
}

/** Supprime une tâche : elle quitte le tableau tout de suite, et y revient si le serveur refuse. */
export function useDeleteTask(slug: string) {
  const board = useBoard(slug);
  return useMutation({
    mutationFn: (number: number) => workspaceService.deleteTask(slug, number),
    onMutate: async (number) => {
      await board.qc.cancelQueries({ queryKey: workspaceKeys.tasks(slug) });
      const previous = board.read();
      board.write((tasks) => removeTask(tasks, number));
      return { previous };
    },
    onError: (_error, _number, context) => {
      if (context?.previous) {
        board.qc.setQueryData(workspaceKeys.tasks(slug), context.previous);
      }
    },
    onSuccess: () => board.refreshSprint(),
  });
}

// ==================== SPRINTS ====================

/** Ouvre ou clôt un sprint : l'en-tête et le tableau (les tâches livrées le quittent) se relisent. */
export function useSprintActions(slug: string) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: workspaceKeys.all(slug) });
  const start = useMutation({
    mutationFn: (body: SprintRequest) => workspaceService.startSprint(slug, body),
    onSuccess: refresh,
    meta: { handlesError: true },
  });
  const close = useMutation({
    mutationFn: () => workspaceService.closeSprint(slug),
    onSuccess: refresh,
    meta: { handlesError: true },
  });
  return { start, close };
}

// ==================== DISCUSSION ====================

function useChatCache(slug: string) {
  const qc = useQueryClient();
  const key = workspaceKeys.chat(slug);
  return {
    qc,
    key,
    read: () => qc.getQueryData<ChatData>(key),
    /** Chaque page, et le rendez-vous épinglé */
    write: (update: (page: TeamChatPage, index: number) => TeamChatPage) =>
      qc.setQueryData<ChatData>(key, (data) => (data ? { ...data, pages: data.pages.map(update) } : data)),
  };
}

// Un message remplacé partout où il est : dans sa page, et épinglé
const replaceMessage = (message: TeamMessage) => (page: TeamChatPage): TeamChatPage => ({
  ...page,
  messages: page.messages.map((candidate) => (candidate.id === message.id ? message : candidate)),
  nextEvent: page.nextEvent?.id === message.id ? message : page.nextEvent,
});

/**
 * Écrit à l'équipe : le message s'affiche tout de suite, « en route », puis prend sa place quand le serveur l'a reçu.
 * Refusé, il disparaît ; le composeur rend le texte (meta.handlesError).
 */
export function useSendMessage(slug: string) {
  const chat = useChatCache(slug);
  const { user } = useAuth();
  return useMutation({
    mutationFn: (body: string) => workspaceService.postMessage(slug, body),
    onMutate: async (body) => {
      await chat.qc.cancelQueries({ queryKey: chat.key });
      // Un identifiant négatif : jamais celui d'un vrai message
      const pending: TeamMessage | null = user
        ? {
            id: -Date.now(),
            kind: 'MESSAGE',
            body,
            author: summaryOf(user),
            createdAt: new Date().toISOString(),
            event: null,
          }
        : null;
      if (pending) {
        chat.write((page, index) => (index === 0 ? { ...page, messages: [...page.messages, pending] } : page));
      }
      return { pendingId: pending?.id };
    },
    onError: (_error, _body, context) => {
      chat.write((page) => ({ ...page, messages: page.messages.filter((message) => message.id !== context?.pendingId) }));
    },
    onSuccess: (message, _body, context) => {
      chat.write((page, index) => {
        const messages = page.messages.filter((candidate) => candidate.id !== context?.pendingId && candidate.id !== message.id);
        return index === 0 ? { ...page, messages: [...messages, message] } : { ...page, messages };
      });
    },
    meta: { handlesError: true },
  });
}

/** Propose un rendez-vous ; la discussion se relit (il peut devenir le rendez-vous épinglé). */
export function useScheduleEvent(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TeamEventRequest) => workspaceService.scheduleEvent(slug, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: workspaceKeys.chat(slug) }),
    meta: { handlesError: true },
  });
}

/** « J'y serai », ou plus : la réponse change tout de suite, et revient si le serveur refuse. */
export function useAttendEvent(slug: string) {
  const chat = useChatCache(slug);
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ message, attending }: { message: TeamMessage; attending: boolean }) =>
      workspaceService.attend(slug, message.id, attending),
    onMutate: async ({ message, attending }) => {
      await chat.qc.cancelQueries({ queryKey: chat.key });
      const previous = chat.read();
      if (message.event && user) {
        const me = summaryOf(user);
        const attendees = message.event.attendees.filter((person) => person.id !== user.id);
        chat.write(replaceMessage({ ...message, event: { ...message.event, attending, attendees: attending ? [...attendees, me] : attendees } }));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        chat.qc.setQueryData(chat.key, context.previous);
      }
    },
    onSuccess: (message) => chat.write(replaceMessage(message)),
  });
}

/** Supprime un message ou un rendez-vous : il disparaît tout de suite, et revient si le serveur refuse. */
export function useDeleteMessage(slug: string) {
  const chat = useChatCache(slug);
  return useMutation({
    mutationFn: (id: number) => workspaceService.deleteMessage(slug, id),
    onMutate: async (id) => {
      await chat.qc.cancelQueries({ queryKey: chat.key });
      const previous = chat.read();
      chat.write((page) => ({
        ...page,
        messages: page.messages.filter((message) => message.id !== id),
        nextEvent: page.nextEvent?.id === id ? null : page.nextEvent,
      }));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        chat.qc.setQueryData(chat.key, context.previous);
      }
    },
    // Un rendez-vous supprimé : le suivant prend sa place en haut
    onSuccess: () => void chat.qc.invalidateQueries({ queryKey: chat.key }),
  });
}

// ==================== L'ÉQUIPE ====================

/**
 * Les gestes sur l'équipe depuis ses réglages : son propre rôle, le rôle d'un membre, son départ, le dépôt et le
 * recrutement. L'espace, la page du projet et l'atelier se relisent ; un membre retiré laisse ses tâches sans preneur.
 */
export function useTeamActions(slug: string, projectId: number) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: workspaceKeys.all(slug) });
    void qc.invalidateQueries({ queryKey: ['project', slug] });
    void qc.invalidateQueries({ queryKey: ['project-members', projectId] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    specialty: useMutation({
      mutationFn: (specialty: TeamRole) => projectService.updateMySpecialty(projectId, specialty),
      onSuccess: refresh,
    }),
    role: useMutation({
      mutationFn: ({ memberId, role }: { memberId: number; role: Exclude<ProjectRole, 'OWNER'> }) =>
        projectService.decide(projectId, memberId, { status: 'ACCEPTED', role }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (memberId: number) => projectService.removeMember(projectId, memberId),
      onSuccess: refresh,
    }),
    /** Le dépôt et le recrutement ; les erreurs (adresse refusée) sont montrées par le formulaire */
    settings: useMutation({
      mutationFn: (body: ProjectSettingsRequest) => projectService.updateSettings(projectId, body),
      onSuccess: (project) => {
        qc.setQueryData(['project', slug], project);
        refresh();
        // La vitrine et les annonces disent qui recrute ; la synchronisation des PR suit le dépôt
        void qc.invalidateQueries({ queryKey: ['projects'] });
        void qc.invalidateQueries({ queryKey: ['openings'] });
        void qc.invalidateQueries({ queryKey: ['reviews', 'repository-sync', slug] });
      },
      meta: { handlesError: true },
    }),
  };
}
