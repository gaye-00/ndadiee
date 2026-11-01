import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/messages/ConversationList';
import EmptyThread from '@/components/messages/EmptyThread';
import MessageThread from '@/components/messages/MessageThread';
import NewConversationDialog from '@/components/messages/NewConversationDialog';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useStartConversation } from '@/hooks/useMessages';
import { paths } from '@/router/paths';

/**
 * Messages privés, en temps réel.
 *
 * - Tablette et ordinateur : la liste des conversations à gauche, la conversation ouverte à droite, dans un même
 *   panneau à la hauteur de l'écran.
 * - Téléphone : la liste ; une conversation ouverte couvre l'écran, et la flèche ramène à la liste.
 * - /messages/12 ouvre la conversation 12 ; /messages?to=awa_diop ouvre (ou crée) celle avec Awa : c'est le lien du
 *   bouton « Envoyer un message » d'un profil.
 */
export default function MessagesPage() {
  const { conversationId } = useParams();
  const id = conversationId && /^\d+$/.test(conversationId) ? Number(conversationId) : null;
  const [composing, setComposing] = useState(false);
  const opening = useOpenFromLink();

  return (
    // Pas de contexte d'empilement sur téléphone : la conversation ouverte (fixed, z-60) doit passer au-dessus de la
    // barre du haut et des onglets. Les lumières de fond, qui en ont besoin, n'apparaissent qu'à partir de la tablette.
    <div className="relative overflow-x-clip md:isolate">
      {/* Lumières de fond, derrière le panneau */}
      <div aria-hidden className="halo halo-gold -top-64 -start-56 -z-10 hidden size-[40rem] opacity-60 md:block" />
      <div aria-hidden className="halo halo-jade -end-64 bottom-0 -z-10 hidden size-[36rem] opacity-40 md:block" />

      <div className="mx-auto max-w-[90rem] md:px-6 md:pt-2 md:pb-6 lg:px-10">
        <div className="md:glass md:grid md:h-[calc(100dvh-6.5rem)] md:grid-cols-[19rem_minmax(0,1fr)] md:overflow-hidden md:rounded-[1.75rem] md:shadow-[0_30px_80px_-50px_var(--float-shadow)] md:backdrop-blur-xl lg:grid-cols-[22rem_minmax(0,1fr)]">
          <ConversationList activeId={id} onNewMessage={() => setComposing(true)} className={id || opening ? 'hidden md:flex' : 'flex'} />
          {id ? (
            <MessageThread key={id} conversationId={id} />
          ) : opening ? (
            <div className="grid min-h-[50dvh] place-items-center">
              <PulsatingDots />
            </div>
          ) : (
            <EmptyThread onNewMessage={() => setComposing(true)} className="hidden md:flex" />
          )}
        </div>
      </div>

      <NewConversationDialog open={composing} onOpenChange={setComposing} />
    </div>
  );
}

/**
 * /messages?to=pseudo : ouvre la conversation avec ce membre, puis la remplace dans l'historique par son adresse. Tant
 * que le pseudo est dans l'adresse, la conversation est en train de s'ouvrir (la réussite comme l'échec l'en retirent).
 */
function useOpenFromLink(): boolean {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const username = searchParams.get('to');
  const { mutate, isPending } = useStartConversation();
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!username || started.current === username) {
      return;
    }
    started.current = username;
    mutate(username, {
      onSuccess: (conversation) => void navigate(paths.conversation(conversation.id), { replace: true }),
      onError: () => void navigate(paths.messages, { replace: true }),
    });
  }, [username, mutate, navigate]);

  return Boolean(username) || isPending;
}
