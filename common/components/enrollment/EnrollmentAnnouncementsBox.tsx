import type { EnrollmentAnnouncement } from '../../types/enrollmentAnnouncements';

type Props = {
  announcements: EnrollmentAnnouncement[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  className?: string;
  hideHeader?: boolean;
};

export function EnrollmentAnnouncementsBox({
  announcements,
  title = 'Enrollment Announcements',
  subtitle = 'Posted by the registrar for enrollment procedures.',
  emptyMessage = 'No enrollment announcements have been posted yet.',
  className,
  hideHeader = false,
}: Props) {
  return (
    <section className={`enrollment-announcements${className ? ` ${className}` : ''}`} aria-labelledby={hideHeader ? undefined : 'enrollment-announcements-title'}>
      {!hideHeader ? (
        <div className="enrollment-announcements__header">
          <div>
            <p className="enrollment-announcements__eyebrow">Enrollment Procedures</p>
            <h3 id="enrollment-announcements-title">{title}</h3>
            <p className="enrollment-announcements__subtitle">{subtitle}</p>
          </div>
        </div>
      ) : null}

      {announcements.length ? (
        <div className="enrollment-announcements__cards">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className={`enrollment-announcements__card${announcement.isPinned ? ' is-pinned' : ''}${announcement.isHighlighted ? ' is-highlighted' : ''}`}
            >
              <div className="enrollment-announcements__card-header">
                <div>
                  <p className="enrollment-announcements__card-label">{announcement.isPinned ? 'Pinned Announcement' : 'Announcement'}</p>
                  <h4>{announcement.title}</h4>
                </div>
                {announcement.isPinned ? <span className="enrollment-announcements__badge">Pinned</span> : null}
              </div>
              <p className="enrollment-announcements__message">{announcement.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="enrollment-announcements__empty notice-box">{emptyMessage}</div>
      )}
    </section>
  );
}
