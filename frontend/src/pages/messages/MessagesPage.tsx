import ConversationList from '@/components/messages/ConversationList';
import MessageThread from '@/components/messages/MessageThread';

/** Messages privés. */
export default function MessagesPage() {
  return (
    <>
      <ConversationList />
      <MessageThread />
    </>
  );
}
