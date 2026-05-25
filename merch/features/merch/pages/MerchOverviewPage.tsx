import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadPublishedMerchCatalog, type MerchCatalogItem } from '../services/merchCatalog';

export function MerchOverviewPage() {
  const [featuredItems, setFeaturedItems] = useState<MerchCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const items = await loadPublishedMerchCatalog();
        if (!isMounted) return;
        setFeaturedItems(items);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load merchandise catalog.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="merch-page">
      <section className="merch-hero">
        <div className="merch-hero__content">
          <p className="merch-hero__brand">School MERCH</p>
          <h2>Show Your Pride. Wear Leon NHS.</h2>
          <p>
            Explore official Leon National High School merchandise.
            Quality items. School spirit. Community pride.
          </p>
          <a href="#merch-catalog" className="primary-button merch-hero__cta">
            Browse All Merchandise
          </a>
        </div>
        <div className="merch-hero__visual" aria-hidden="true" />
      </section>

      <section className="merch-categories">
        <h3>Shop by Category</h3>
        <div className="merch-categories__grid">
          <article className="merch-category-card"><strong>Apparel</strong><span>T-shirts, Hoodies, Jackets</span></article>
          <article className="merch-category-card"><strong>Headwear</strong><span>Caps, Hats, Beanies</span></article>
          <article className="merch-category-card"><strong>Bags & Accessories</strong><span>Totes, Backpacks, More</span></article>
          <article className="merch-category-card"><strong>Drinkware</strong><span>Tumblers, Bottles, Mugs</span></article>
          <article className="merch-category-card"><strong>School Essentials</strong><span>Notebooks, Pens, More</span></article>
          <article className="merch-category-card"><strong>Gift Items</strong><span>Souvenirs, Keepsakes</span></article>
        </div>
      </section>

      <section className="merch-update-banner" aria-label="Merchandise update notice">
        <strong>Stay Updated!</strong>
        <span>New merchandise and limited editions are added regularly. Check back often.</span>
      </section>

      <div className="merch-store-layout" id="merch-catalog">
        <section className="merch-store-catalog">
          <h3>Featured Merchandise</h3>
          {isLoading ? <p>Loading merchandise catalog...</p> : null}
          {!isLoading && error ? <p className="login-card__error">{error}</p> : null}
          {!isLoading && !error && featuredItems.length === 0 ? (
            <p>No published merchandise is available yet.</p>
          ) : null}
          <div className="merch-product-grid">
            {featuredItems.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="merch-product-card merch-product-card--link"
                aria-label={`Open ${item.name} product page`}
              >
                <article>
                  <div className="merch-product-card__image-wrap">
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt={`${item.name} product image`}
                        className="merch-product-card__image"
                      />
                    ) : (
                      <div className="merch-product-card__image-placeholder" aria-hidden="true">
                        No Image
                      </div>
                    )}
                  </div>
                  <span className="merch-product-card__category">{item.category}</span>
                  <h4>{item.name}</h4>
                  <p className="merch-product-card__price">PHP {item.price.toFixed(2)}</p>
                  <p className="merch-product-card__stock">Stock Available: {item.stockQty}</p>
                  <span className="merch-product-card__cta">View Product</span>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
