import usisIcon from '../../../../../common/assets/USIS_Icon.png';

type ComingSoonModalCardProps = {
  message: string;
};

export function ComingSoonModalCard({ message }: ComingSoonModalCardProps) {
  return (
    <article className="learner-coming-soon" role="status" aria-live="polite">
      <div className="learner-coming-soon__icon-wrap" aria-hidden="true">
        <img src={usisIcon} alt="" className="learner-coming-soon__icon" />
      </div>
      <div className="learner-coming-soon__body">
        <strong>COMING SOON</strong>
        <span>{message}</span>
      </div>
    </article>
  );
}
