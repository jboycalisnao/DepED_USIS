interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <section className="page-intro">
      <p className="page-intro__eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="mt-3">{description}</p>
    </section>
  );
}
