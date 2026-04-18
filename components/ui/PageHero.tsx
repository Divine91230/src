export function PageHero({ title, description }: { title: string; description: string }) {
  return (
    <section className="hero premium-hero">
      <div className="hero-kicker">DCP Patrimoine</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}
