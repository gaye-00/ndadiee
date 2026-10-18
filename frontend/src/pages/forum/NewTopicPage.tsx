import SignInDialog from '@/components/forum/SignInDialog';
import TopicForm from '@/components/forum/TopicForm';

/** Ouvrir un sujet sur le forum : le formulaire, et son brouillon gardé sur l'appareil. */
export default function NewTopicPage() {
  return (
    <>
      <TopicForm />
      <SignInDialog />
    </>
  );
}
