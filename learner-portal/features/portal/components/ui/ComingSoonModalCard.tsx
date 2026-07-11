import { UsisComingSoonCard } from '../../../../../common/components/UsisComingSoonCard';

type ComingSoonModalCardProps = {
  message: string;
};

export function ComingSoonModalCard({ message }: ComingSoonModalCardProps) {
  return <UsisComingSoonCard message={message} />;
}
