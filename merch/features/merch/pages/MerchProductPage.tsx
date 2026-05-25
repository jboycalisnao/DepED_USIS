import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { loadPublishedMerchItemBySlug, type MerchCatalogItem } from '../services/merchCatalog';

export function MerchProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<MerchCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!slug) {
        setError('Product URL is invalid.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const record = await loadPublishedMerchItemBySlug(slug);
        if (!isMounted) return;
        if (!record) {
          setError('Product not found.');
          setItem(null);
          return;
        }
        setItem(record);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load product details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleBackToShowcase = () => {
    setIsNavigatingBack(true);
    window.setTimeout(() => {
      navigate('/');
    }, 350);
  };

  if (isLoading || isNavigatingBack) {
    const loadingMessage = isNavigatingBack ? 'Loading merchandise showcase...' : 'Loading product details...';
    return <UsisPageLoader message={loadingMessage} />;
  }

  return (
    <section className="merch-product-page">
      <p className="merch-product-page__backline">
        <button type="button" className="merch-product-page__backlink" onClick={handleBackToShowcase}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Back to Merchandise Showcase
        </button>
      </p>
      {error ? <p className="login-card__error">{error}</p> : null}
      {!error && item ? (
        <article className="merch-product-page__card">
          <div className="merch-product-page__image-wrap">
            {item.primaryImageUrl ? (
              <img src={item.primaryImageUrl} alt={`${item.name} product image`} className="merch-product-page__image" />
            ) : (
              <div className="merch-product-page__image-placeholder" aria-hidden="true">
                No Image
              </div>
            )}
          </div>
          <div className="merch-product-page__details">
            <div className="merch-product-page__tags">
              <span className="merch-product-page__category">{item.category}</span>
              {item.isPreOrder ? <span className="merch-product-page__preorder-tag">Pre-order</span> : null}
            </div>
            <h2>{item.name}</h2>
            <p className="merch-product-page__price">PHP {item.price.toFixed(2)}</p>
            <p className="merch-product-page__stock">
              {item.isPreOrder ? 'Available via pre-order request.' : `Available Stock: ${item.stockQty}`}
            </p>
            {item.availableSizes.length > 0 ? (
              <div className="merch-product-page__sizes">
                <strong>Available Sizes</strong>
                <div className="merch-product-page__size-list">
                  {item.availableSizes.map((size) => (
                    <span key={`${item.id}-${size}`} className="merch-product-page__size-chip">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="merch-product-page__description">
              {item.description || 'Product details are managed by the school merchandise office.'}
            </p>
            <p className="merch-product-page__purchase-note">
              Visit the school merchandise office to place your request.
            </p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
