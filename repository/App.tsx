import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { repositoryPosts } from './features/repository/data/repositoryPosts';

function RepositoryHomePage() {
  const featuredPosts = repositoryPosts.slice(0, 3);
  const recentPosts = repositoryPosts.slice(0, 6);

  return (
    <main className="page-frame repository-main">
      <div className="content-width">
        <section className="page-intro repository-hero">
          <p className="page-intro__eyebrow">Academic Posting Center</p>
          <h1>School Repository</h1>
          <p>
            A centralized place for school academic notices, schedules, learning references, and official posting
            materials.
          </p>
        </section>

        <section className="repository-stats" aria-label="Repository summary">
          <article className="section-card repository-stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Recent postings</h3>
              <p>Ready for class advisories, assessment notes, and academic circulars.</p>
            </div>
          </article>
          <article className="section-card repository-stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Collection areas</h3>
              <p>Announcements, lesson references, assessment schedules, and subject advisories.</p>
            </div>
          </article>
          <article className="section-card repository-stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Posting standard</h3>
              <p>Use one clear title, audience, effective date, and supporting attachments when available.</p>
            </div>
          </article>
        </section>

        <section className="section-shell repository-section">
          <div className="section-shell__header">
            <p className="section-shell__eyebrow">Featured</p>
            <h2>Highlighted academic posts</h2>
            <p className="section-shell__description">
              These entries surface the most important academic updates for teachers, learners, and coordinators.
            </p>
          </div>
          <div className="repository-post-grid">
            {featuredPosts.map((post) => (
              <article key={post.slug} className="info-card repository-post-card">
                <div className="info-card__bar" />
                <div className="info-card__content">
                  <p className="repository-post-card__meta">
                    {post.category} | {post.audience}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                  <p className="repository-post-card__date">Posted {post.publishedOn}</p>
                  <Link className="repository-post-card__link" to={`/posts/${post.slug}`}>
                    Open post
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell repository-section">
          <div className="section-shell__header">
            <p className="section-shell__eyebrow">Repository</p>
            <h2>Recent academic postings</h2>
            <p className="section-shell__description">
              Use this area for school bulletins, schedules, course references, performance task notes, and other
              academic content that should stay easy to find.
            </p>
          </div>
          <div className="repository-feed">
            {recentPosts.map((post) => (
              <article key={post.slug} className="section-card repository-feed-item">
                <div className="section-card__bar" />
                <div className="section-card__content">
                  <p className="repository-feed-item__meta">
                    {post.category} | {post.audience} | {post.publishedOn}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                  <div className="repository-tag-row" aria-label="Post tags">
                    {post.tags.map((tag) => (
                      <span key={tag} className="repository-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell repository-section">
          <div className="section-shell__header">
            <p className="section-shell__eyebrow">Posting rules</p>
            <h2>Repository guidance</h2>
          </div>
          <div className="repository-guidance-grid">
            <article className="notice-box">
              <strong>Use clear scope</strong>
              <span>Specify whether the post is for all learners, a grade level, a section, or a subject group.</span>
            </article>
            <article className="notice-box">
              <strong>Keep attachments organized</strong>
              <span>Group handouts, rubrics, calendars, and reference files under the same post when they belong together.</span>
            </article>
            <article className="notice-box">
              <strong>Archive by term</strong>
              <span>Retain major academic notices by school year, quarter, or semester for quick reference and review.</span>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function RepositoryPostPage() {
  const { slug } = useParams();
  const post = repositoryPosts.find((entry) => entry.slug === slug);

  if (!post) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="page-frame repository-main">
      <div className="content-width">
        <section className="page-intro repository-hero">
          <p className="page-intro__eyebrow">Academic Post</p>
          <h1>{post.title}</h1>
          <p>{post.summary}</p>
        </section>

        <section className="section-shell repository-section">
          <div className="repository-post-detail">
            <article className="portal-panel">
              <div className="portal-panel__header">
                <h2>{post.category}</h2>
              </div>
              <div className="portal-panel__body repository-post-detail__body">
                <p className="repository-post-card__meta">
                  Audience: {post.audience} | Posted: {post.publishedOn}
                </p>
                <p>{post.body}</p>
                <div className="repository-tag-row" aria-label="Post tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="repository-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link className="repository-back-link" to="/">
                  Back to repository
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function RepositoryShell() {
  return (
    <div className="repository-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader homeHref="/" />
        </div>
      </header>

      <Routes>
        <Route path="/" element={<RepositoryHomePage />} />
        <Route path="/posts/:slug" element={<RepositoryPostPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RepositoryShell />
    </BrowserRouter>
  );
}
