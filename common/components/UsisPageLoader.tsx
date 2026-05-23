import usisIcon from '../assets/USIS_Icon.png';
import '../css/page-loader.css';

type UsisPageLoaderProps = {
  message?: string;
};

export default function UsisPageLoader({ message = 'Loading page status...' }: UsisPageLoaderProps) {
  return (
    <div className="usis-page-loader" role="status" aria-live="polite" aria-label={message}>
      <div className="usis-page-loader__inner">
        <div className="usis-page-loader__spinner" aria-hidden="true">
          <span className="usis-page-loader__ring usis-page-loader__ring--blue" />
          <span className="usis-page-loader__ring usis-page-loader__ring--red" />
          <span className="usis-page-loader__ring usis-page-loader__ring--yellow" />
          <div className="usis-page-loader__icon-wrap">
            <img src={usisIcon} alt="USIS" />
          </div>
        </div>
        <p className="usis-page-loader__text">{message}</p>
      </div>
    </div>
  );
}

