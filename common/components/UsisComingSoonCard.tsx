import usisIcon from '../assets/USIS_Icon.png';

type UsisComingSoonCardProps = {
  message: string;
  title?: string;
};

export function UsisComingSoonCard({ message, title = 'Coming Soon' }: UsisComingSoonCardProps) {
  return (
    <article className="usis-coming-soon" role="status" aria-live="polite">
      <div className="usis-coming-soon__icon-wrap" aria-hidden="true">
        <img src={usisIcon} alt="" className="usis-coming-soon__icon" />
      </div>
      <div className="usis-coming-soon__body">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
    </article>
  );
}
