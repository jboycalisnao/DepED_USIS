export function MerchOverviewPage() {
  const featuredItems = [
    { id: 'merch-001', name: 'School ID Lace', category: 'ID Accessories', price: 'PHP 45', stock: 120 },
    { id: 'merch-002', name: 'PE Shirt', category: 'Uniform', price: 'PHP 280', stock: 64 },
    { id: 'merch-003', name: 'Department Shirt', category: 'Uniform', price: 'PHP 350', stock: 38 },
    { id: 'merch-004', name: 'School Patch Set', category: 'Uniform Accessories', price: 'PHP 90', stock: 85 },
  ];

  return (
    <section className="merch-page">
      <header className="merch-page__header">
        <h2>School Merchandise Store</h2>
        <p>
          Browse available school merchandise, check stock levels, and prepare order intake for
          learner and school community purchases.
        </p>
      </header>

      <div className="merch-store-layout">
        <section className="merch-store-catalog">
          <h3>Featured Merchandise</h3>
          <div className="merch-product-grid">
            {featuredItems.map((item) => (
              <article key={item.id} className="merch-product-card">
                <span className="merch-product-card__category">{item.category}</span>
                <h4>{item.name}</h4>
                <p className="merch-product-card__price">{item.price}</p>
                <p className="merch-product-card__stock">Stock Available: {item.stock}</p>
                <button type="button" className="primary-button">
                  Add to Cart
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="merch-store-summary">
          <h3>Current Cart</h3>
          <article className="merch-note-box">
            <strong>Items selected</strong>
            <span>0 item(s) currently in cart.</span>
          </article>
          <article className="merch-note-box">
            <strong>Order total</strong>
            <span>PHP 0.00</span>
          </article>
          <button type="button" className="primary-button" disabled>
            Proceed to Checkout
          </button>
        </aside>
      </div>
    </section>
  );
}
